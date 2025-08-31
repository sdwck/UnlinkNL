import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import * as sudo from 'sudo-prompt';
import { IAppSettings, IProfile } from '../../shared/types';
import { settingsStore } from '../store/SettingsStore';
import { toCamelCase } from '../utils/format';
import { profileStore } from '../store/ProfileStore';

export interface CliRunOptions {
    previousProfile: IProfile;
    newProfile: IProfile;
    overwriteAutoCopySettings?: boolean;
}

interface CliLog {
    level: 'Information' | 'Warning' | 'Error';
    message: string;
    timestamp: string;
}

export class CliService {
    private readonly exePath: string;
    private readonly sudoOptions = {
        name: 'UnlinkNL',
    };

    constructor(private mainWindow: BrowserWindow) {
        const isDev = process.env.NODE_ENV === 'development';
        this.exePath = isDev
            ? path.join(app.getAppPath(), 'resources', 'UnlinkNL.Executor.exe')
            : path.join(process.resourcesPath, 'UnlinkNL.Executor.exe');
    }

    private log(message: string) {
        console.log(`[CliService] ${message}`);
    }

    private sendToRenderer(channel: string, data: unknown) {
        this.mainWindow.webContents.send(channel, data);
    }

    private getToolPath(): string {
        const isDev = process.env.NODE_ENV === 'development';
        return isDev
            ? path.join(app.getAppPath(), 'resources', 'Volumeid64.exe')
            : path.join(process.resourcesPath, 'Volumeid64.exe');
    }

    private buildArgs(settings: IAppSettings, options?: CliRunOptions): string[] {
        const args: string[] = [];
        const toolPath = this.getToolPath();

        if (settings.terminateSteam) args.push('--terminateSteam');
        if (settings.changeHwid) args.push('--changeHwid', `--toolPath="${toolPath}"`);
        if (settings.randomizeMacs) args.push('--randomMacs');
        if (settings.cleanRegedit) args.push('--cleanRegedit');
        if (settings.changeMguid) args.push('--changeMguid');
        if (settings.startSteam) args.push('--startSteamService');
        if (settings.steamPath) args.push(`--steamPath="${settings.steamPath}"`);

        if (options) {
            args.push('--performUnlink');
            args.push(`--selectedProfileName=${options.previousProfile.id}`);
            args.push(`--newProfileName=${options.newProfile.id}`);
        }

        if ((options?.overwriteAutoCopySettings ?? (options && settings.autoCopySettings))) {
            args.push('--autoCopySettings');
            if (settings.appId) args.push(`--appId=${settings.appId}`);
            if (settings.refAccountId) args.push(`--refAccountId=${settings.refAccountId}`);
            if (settings.refProfileName) args.push(`--refProfileName=${settings.refProfileName}`);
        }

        return args;
    }

    private executeElevatedCommand(args: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const command = `"${this.exePath}" ${args.join(' ')}`;
            this.log(`Executing with elevation: ${command}`);

            sudo.exec(command, this.sudoOptions, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (stderr) {
                    this.log(`stderr from elevated process: ${stderr.toString()}`);
                    this.sendToRenderer('unlink:log', { level: 'Error', message: stderr.toString() });
                }

                const output = stdout ? stdout.toString() : '';
                const lines = output.split('\n').filter(line => line.trim() !== '');
                let finalJson = '';

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.trim());
                        if (json === '') continue;
                        if ('success' in json || 'error' in json) {
                            finalJson = line.trim();
                        } else {
                            this.sendToRenderer('unlink:log', json as CliLog);
                        }
                    } catch (e) {
                        this.log(`Non-JSON output from CLI: ${line}`);
                        this.sendToRenderer('unlink:log', { level: 'Warning', message: `CLI raw output: ${line}` });
                    }
                }

                if (!finalJson) {
                    reject(new Error('Elevated process finished without a conclusive JSON output.'));
                    return;
                }

                try {
                    resolve(JSON.parse(finalJson));
                } catch (e) {
                    reject(new Error('Failed to parse final JSON output from elevated CLI.'));
                }
            });
        });
    }

    private executeCommand(args: string[]): Promise<any> {
        return new Promise((resolve) => {
            const child = spawn(this.exePath, args);
            let finalJson = '';
            let stderrOutput = '';

            child.stdout.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.trim());
                        if (json === '') continue;
                        if ('success' in json || 'error' in json) {
                            finalJson = line.trim();
                        } else {
                            this.sendToRenderer('unlink:log', json as CliLog);
                        }
                    } catch (e) {
                        this.log(`Non-JSON output from CLI: ${line}`);
                        this.sendToRenderer('unlink:log', { level: 'Warning', message: `CLI raw output: ${line}` });
                    }
                }
            });

            child.stderr.on('data', (data: Buffer) => {
                stderrOutput += data.toString();
                this.log(`stderr: ${data.toString()}`);
                this.sendToRenderer('unlink:log', { level: 'Error', message: data.toString() });
            });

            child.on('close', (code) => {
                if (finalJson) {
                    try {
                        resolve(JSON.parse(finalJson));
                    } catch (e) {
                        resolve({ success: false, error: 'Failed to parse final JSON output from CLI.' });
                    }
                } else if (code !== 0) {
                    resolve({ success: false, error: `CLI process exited with code ${code}. Stderr: ${stderrOutput}` });
                } else {
                    resolve({ success: true, message: 'Process finished without output.' });
                }
            });

            child.on('error', (err) => {
                resolve({ success: false, error: `Failed to start CLI process: ${err.message}` });
            });
        });
    }

    public async createProfile(profileName: string, settings: IAppSettings): Promise<{ id: string, name: string }> {
        const newProfileId = toCamelCase(profileName);

        if (profileStore.getAll().some(p => p.id === newProfileId)) {
            throw new Error(`A profile folder named '${newProfileId}' already exists.`);
        }

        const newProfileData: IProfile = {
            id: newProfileId,
            name: profileName,
            steamAccounts: []
        };

        const previousProfileId = settings.selectedProfileId;
        const previousProfile = profileStore.getAll().find(p => p.id === previousProfileId);

        if (!previousProfile) {
            throw new Error(`Could not find the currently selected profile ('${previousProfileId}') to create a new one from.`);
        }

        const creationSettings: IAppSettings = {
            ...settings,
            autoCopySettings: false
        };

        const options: CliRunOptions = {
            previousProfile: previousProfile,
            newProfile: newProfileData
        };

        const args = this.buildArgs(creationSettings, options);
        const result = await this.executeElevatedCommand(args);

        if (result.success) {
            settingsStore.set('selectedProfileId', newProfileId);
            this.log(`Profile created. Switched active profile to: ${newProfileId}`);
        }

        return { id: newProfileId, name: profileName };
    }

    public async runUnlink(settings: IAppSettings, options: CliRunOptions): Promise<void> {
        this.sendToRenderer('unlink:start', {});
        const args = this.buildArgs(settings, options);

        try {
            const result = await this.executeElevatedCommand(args);
            if (result.success) {
                this.log(`Unlink successful. Updating selected profile to: ${options.newProfile.id}`);
                settingsStore.set('selectedProfileId', options.newProfile.id);
            }
            this.sendToRenderer('unlink:finish', result);
        } catch (error) {
            this.sendToRenderer('unlink:finish', { success: false, error: error.message });
        }
    }

    public getSteamPath(): Promise<{ success: boolean; steamPath?: string; error?: string; }> {
        return this.executeCommand(['--getSteamPath']);
    }


    public getSelectedProfile(steamPath: string): Promise<{ success: boolean; currentProfile?: string; error?: string; }> {
        return this.executeCommand(['--getSelectedProfile', `--steamPath="${steamPath}"`]);
    }

    public async deleteProfile(profileId: string): Promise<void> {
        const args = ['--terminateSteam', `--removeProfileName=${profileId}`];
        return this.executeCommand(args);
    }

    public async deleteAccount(profileId: string, accountId: string): Promise<void> {
        const args = ['--terminateSteam', `--removeProfileName=${profileId}`, `--removeAccountId=${accountId}`];
        return this.executeCommand(args);
    }
}