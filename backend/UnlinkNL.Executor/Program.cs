using Newtonsoft.Json;
using UnlinkNL.Executor.Services;
using UnlinkNL.Executor.Util;

ILogger logger = new JsonLogger();

try
{
    var options = Options.ParseArgs(args);

    var registryService = new RegistryService(logger);
    var steamService = new SteamService(logger);
    var settingsTransferService = new SettingsTransferService(logger);
    var hardwareIdentityService = new HardwareIdentityService(logger);

    if (options.GetSteamPath)
    {
        var steamPath = registryService.GetSteamPath();
        if (string.IsNullOrWhiteSpace(steamPath))
            return Output(new { error = "Steam path not found." });

        return Output(new { success = true, steamPath });
    }

    if (options.GetSelectedProfile && !string.IsNullOrWhiteSpace(options.SteamPath))
        return Output(steamService.TryGetSelectedProfile(options.SteamPath, out var currentProfile)
            ? new { success = true, currentProfile }
            : new { error = "Failed to get selected profile." });

    if (!string.IsNullOrWhiteSpace(options.RemoveAccountId) && !string.IsNullOrWhiteSpace(options.RemoveProfileName))
        return Output(steamService.RemoveAccountFromProfile(options.RemoveProfileName, options.RemoveAccountId)
            ? new { success = true }
            : new { error = $"Failed to remove account {options.RemoveAccountId} from profile {options.SelectedProfileName}." });
    
    if (!string.IsNullOrWhiteSpace(options.RemoveProfileName))
        return Output(steamService.RemoveProfile(options.RemoveProfileName)
            ? new { success = true }
            : new { error = $"Failed to remove profile {options.RemoveProfileName}." });

    var elevator = new ElevatorService(logger);
    if (!elevator.IsRunningAsAdministrator())
    {
        logger.LogTrace("Not running as administrator, restarting with elevated privileges.");
        elevator.RestartAsAdmin();
        return 0;
    }

    logger.LogTrace($"Starting UnlinkNL with options: {JsonConvert.SerializeObject(options)}");

    if (options.TerminateSteam)
        steamService.TerminateSteam();

    if (options.ChangeHwid && !string.IsNullOrWhiteSpace(options.ToolPath))
        hardwareIdentityService.ChangeHwid(options.ToolPath);

    if (options.RandomMacs)
        registryService.RandomizeMacs();

    if (options.CleanRegedit)
        registryService.CleanRegedit();

    if (options.ChangeMguid)
        registryService.ChangeMguid();

    if (options.PerformUnlink &&
        !string.IsNullOrWhiteSpace(options.SteamPath) &&
        !string.IsNullOrWhiteSpace(options.SelectedProfileName) &&
        !string.IsNullOrWhiteSpace(options.NewProfileName))
    {
        steamService.TryGetSelectedProfile(options.SteamPath, out var realCurrentProfileName);
        steamService.BackupProfile(options.SteamPath, options.SelectedProfileName, options.NewProfileName, realCurrentProfileName);
    }

    if (options.StartSteamService && !string.IsNullOrWhiteSpace(options.SteamPath))
        steamService.StartSteamService(options.SteamPath);

    if (options.AutoCopySettings &&
        !string.IsNullOrWhiteSpace(options.AppId) &&
        !string.IsNullOrWhiteSpace(options.SelectedProfileName) &&
        !string.IsNullOrWhiteSpace(options.RefAccountId) &&
        !string.IsNullOrWhiteSpace(options.NewProfileName))
        await settingsTransferService.AutoCopySettingsAsync(options.AppId, options.RefProfileName,
            options.RefAccountId, options.NewProfileName);

    if (string.IsNullOrWhiteSpace(options.SteamPath) || !options.PerformUnlink)
        return Output(new { success = true });

    return Output(steamService.TryGetSelectedProfile(options.SteamPath, out var selectedProfile)
        ? new { success = true, selectedProfile }
        : new { error = "Failed to get selected profile." });
}
catch (Exception ex)
{
    return Error(ex.Message);
}

int Output(object obj)
{
    Console.WriteLine(JsonConvert.SerializeObject(obj));
    return 0;
}

int Error(string message)
{
    logger.LogError(message);
    return 1;
}