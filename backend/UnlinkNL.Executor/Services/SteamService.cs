using System.Diagnostics;
using UnlinkNL.Executor.Util;

namespace UnlinkNL.Executor.Services;

public class SteamService
{
    private readonly string[] _backupFolders = { "appcache", "config", "dumps", "logs", "userdata" };

    private static string BackupRoot =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "NL", "Unlink", "profiles");

    private readonly ILogger _logger;

    public SteamService(ILogger logger)
    {
        _logger = logger;
    }

    public bool IsSteamPathValid(string path)
    {
        try
        {
            var steamPath = Path.Combine(path, "steam.exe");
            return File.Exists(steamPath);
        }
        catch (Exception)
        {
            return false;
        }
    }

    public void TerminateSteam()
    {
        var processes = Process.GetProcesses();

        foreach (var process in processes)
        {
            try
            {
                if (!process.ProcessName.Contains("steam", StringComparison.CurrentCultureIgnoreCase)) continue;
                _logger.LogTrace($"Terminating: {process.ProcessName} (ID: {process.Id})");
                process.Kill();
                process.WaitForExit();
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Can't terminate process {process.ProcessName}: {ex.Message}");
            }
        }

        _logger.LogInformation("Terminated Steam.");
    }

    public bool RemoveProfile(string profileName)
    {
        var profileBackupRoot = Path.Combine(
            BackupRoot,
            profileName);

        if (!Directory.Exists(profileBackupRoot))
        {
            _logger.LogWarning($"Profile backup directory {profileBackupRoot} does not exist.");
            return false;
        }

        try
        {
            Directory.Delete(profileBackupRoot, true);
            _logger.LogInformation($"Removed profile backup directory: {profileBackupRoot}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to remove profile backup directory {profileBackupRoot}: {ex.Message}");
        }
        
        return false;
    }

    public bool RemoveAccountFromProfile(string profileName, string accountId)
    {
        var profileBackupRoot = Path.Combine(
            BackupRoot,
            profileName,
            "userdata",
            accountId);

        if (!Directory.Exists(profileBackupRoot))
        {
            _logger.LogWarning($"Account directory {profileBackupRoot} does not exist in profile {profileName}.");
            return false;
        }

        try
        {
            Directory.Delete(profileBackupRoot, true);
            _logger.LogInformation($"Removed account {accountId} from profile {profileName}.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to remove account {accountId} from profile {profileName}: {ex.Message}");
        }

        return false;
    }

    public void BackupProfile(string steamPath, string previousProfileName, string profileName, string realCurrentProfileName)
    {
        if (string.IsNullOrWhiteSpace(steamPath)) return;

        var prevProfileBackupRoot = Path.Combine(
            BackupRoot,
            previousProfileName);

        var profileBackupRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            BackupRoot,
            profileName);

        if (!Directory.Exists(prevProfileBackupRoot))
            Directory.CreateDirectory(prevProfileBackupRoot);

        if (!Directory.Exists(profileBackupRoot))
            Directory.CreateDirectory(profileBackupRoot);

        foreach (var folder in _backupFolders)
        {
            var steamFolderPath = Path.Combine(steamPath, folder);
            var prevBackupFolderPath = Path.Combine(prevProfileBackupRoot, folder);
            var backupFolderPath = Path.Combine(profileBackupRoot, folder);
            
            if (previousProfileName != realCurrentProfileName && IsSymbolicLink(steamFolderPath))
            {
                if (Directory.Exists(steamFolderPath))
                    Directory.Delete(Path.Combine(steamFolderPath), true);
            }

            if (IsSymbolicLink(steamFolderPath))
            {
                _logger.LogTrace($"{steamFolderPath} is a symbolic link. Replacing it with actual one");
                Directory.Delete(steamFolderPath);
            }
            else
            {
                _logger.LogInformation($"Backing up {folder} to {prevBackupFolderPath}");
                if (Directory.Exists(prevBackupFolderPath))
                    Directory.Delete(prevBackupFolderPath, true);
                try
                {
                    Directory.CreateDirectory(steamFolderPath);
                    Directory.Move(steamFolderPath, prevBackupFolderPath);
                }
                catch (IOException ioEx)
                {
                    _logger.LogError(
                        $"IO Error while moving {steamFolderPath} → {prevBackupFolderPath}: {ioEx.Message}");
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Unexpected error while moving folder: {ex.Message}");
                    throw;
                }
            }

            if (TryCreateSymbolicLink(steamFolderPath, backupFolderPath))
                _logger.LogTrace($"Linked {steamFolderPath} -> {backupFolderPath}");
            else
                _logger.LogWarning($"Failed to create symlink for {steamFolderPath}");
        }

        _logger.LogInformation("Backup completed.");
    }

    public void StartSteamService(string steamPath)
    {
        var steamServicePath = Path.Combine(steamPath, "steam.exe");

        if (!File.Exists(steamServicePath))
        {
            _logger.LogError("Cannot find steam.exe");
            return;
        }

        var startInfo = new ProcessStartInfo(steamServicePath)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            Verb = "runas"
        };

        Process.Start(startInfo);

        _logger.LogInformation("Started Steam service.");
    }

    public bool TryGetSelectedProfile(string steamPath, out string selectedProfileName)
    {
        var configPath = Path.Combine(steamPath, "config");

        if (!Directory.Exists(configPath))
        {
            selectedProfileName = string.Empty;
            return false;
        }

        try
        {
            var realPath = ProcessUtils.GetRealPath(configPath);
            var pathParts = realPath.Split(Path.DirectorySeparatorChar);
            var configIndex = Array.LastIndexOf(pathParts, "config");

            if (configIndex > 0)
            {
                selectedProfileName = pathParts[configIndex - 1];
                return true;
            }

            selectedProfileName = string.Empty;
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed to get selected profile: {ex.Message}");
            selectedProfileName = string.Empty;
            return false;
        }
    }

    private static bool IsSymbolicLink(string path)
    {
        if (!Directory.Exists(path))
            return false;

        var dirInfo = new DirectoryInfo(path);
        return dirInfo.Attributes.HasFlag(FileAttributes.ReparsePoint);
    }

    private static bool TryCreateSymbolicLink(string linkPath, string targetPath)
    {
        if (!Directory.Exists(targetPath))
            Directory.CreateDirectory(targetPath);
        var command = $"/c mklink /D \"{linkPath}\" \"{targetPath}\"";
        var psi = new ProcessStartInfo("cmd.exe", command)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(psi);
        process?.WaitForExit();
        return process is null || process.ExitCode == 0;
    }
}