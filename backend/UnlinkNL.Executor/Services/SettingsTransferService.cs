using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using Microsoft.Win32;
using UnlinkNL.Executor.Util;

namespace UnlinkNL.Executor.Services;

public class SettingsTransferService
{
    private readonly ILogger _logger;

    private static string BackupRoot =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "NL", "Unlink", "profiles");

    public SettingsTransferService(ILogger logger)
    {
        _logger = logger;
    }

    public async Task AutoCopySettingsAsync(string appId, string refProfileName, string refAccountId, string profileName)
    {
        if (appId == "0")
        {
            _logger.LogInformation("App ID is 0, skipping settings transfer.");
            return;
        }

        if (profileName == refProfileName)
        {
            _logger.LogInformation("Profile names are the same, skipping settings transfer.");
            return;
        }
        
        var newProfileUserdata = Path.Combine(BackupRoot, profileName, "userdata");
        if (!Directory.Exists(newProfileUserdata))
        {
            _logger.LogInformation("New profile userdata directory does not exist, skipping settings transfer.");
            return;
        }

        var newProfileUserdataDirectories = Directory.GetDirectories(newProfileUserdata);
        if (newProfileUserdataDirectories.Length == 0)
        {
            _logger.LogInformation("No account directories found in new profile userdata, skipping settings transfer.");
            return;
        }

        var doesGameExist = newProfileUserdataDirectories
            .Any(dir => Directory.Exists(Path.Combine(dir, appId)));
        if (!doesGameExist)
        {
            _logger.LogInformation($"Game with ID {appId} does not exist in new profile userdata, skipping settings transfer.");
            return;
        }

        var oldProcesses = Process.GetProcesses();
        await StartAppAsync(appId);

        var timeout = TimeSpan.FromMinutes(3);
        var isAppStarted = false;

        for (var i = 0d; i < timeout.TotalSeconds; i += 0.5)
        {
            if (i % 10 == 0)
                _logger.LogInformation($"Waiting for app to start ({Math.Round(i)}/{timeout.TotalSeconds})");
            await Task.Delay(500);
            var isAppUpdating = IsAppUpdating(appId);
            isAppStarted = IsAppStarted(appId);
            if (isAppUpdating)
            {
                for (var j = 0; j < timeout.TotalSeconds * 3; j++)
                {
                    if (!IsAppUpdating(appId)) break;
                    if (j % 10 == 0)
                        _logger.LogInformation($"Waiting for app to update ({j}/{timeout.TotalSeconds * 3} seconds)");
                    await Task.Delay(1000);
                }

                if (IsAppUpdating(appId))
                {
                    _logger.LogError($"App is still updating after {timeout.TotalSeconds * 3} seconds");
                    return;
                }

                _logger.LogInformation("App updated successfully.");
            }

            if (isAppStarted) break;
        }

        if (!isAppStarted)
        {
            _logger.LogError($"App did not start within the period ({timeout.TotalSeconds}/{timeout.TotalSeconds})");
            return;
        }

        if (await TryCloseAppAsync(oldProcesses))
        {
            await CopySettingsAsync(appId, refProfileName, refAccountId, profileName);
            await StartAppAsync(appId);
        }
    }

    [SuppressMessage("Interoperability", "CA1416:Validate platform compatibility")]
    private bool IsAppStarted(string appId)
    {
        var registryKeyPath = @$"Software\Valve\Steam\Apps\{appId}";
        const string registryValueName = "Running";

        using var registryKey = Registry.CurrentUser.OpenSubKey(registryKeyPath);
        if (registryKey == null) return false;
        try
        {
            if (registryKey.GetValue(registryValueName) is int value)
                return value == 1;
        }
        catch (Exception ex)
        {
            _logger.LogTrace($"Error reading registry value: {ex.Message}");
            return false;
        }

        return false;
    }

    [SuppressMessage("Interoperability", "CA1416:Validate platform compatibility")]
    private bool IsAppUpdating(string appId)
    {
        var registryKeyPath = @$"Software\Valve\Steam\Apps\{appId}";
        const string registryValueName = "Updating";

        using var registryKey = Registry.CurrentUser.OpenSubKey(registryKeyPath);
        if (registryKey == null) return false;
        try
        {
            if (registryKey.GetValue(registryValueName) is int value)
                return value == 1;
        }
        catch (Exception ex)
        {
            _logger.LogTrace($"Error reading registry value: {ex.Message}");
            return false;
        }

        return false;
    }

    private async Task CopySettingsAsync(string appId, string refProfileName, string refAccountId, string profileName)
    {
        var referenceAccountGamePath = Path.Combine(
            BackupRoot,
            refProfileName,
            "userdata",
            refAccountId,
            appId);

        if (!Directory.Exists(referenceAccountGamePath))
            return;

        foreach (var accountPath in GetAllProfileAccountIds(profileName))
        {
            var accountGamePath = Path.Combine(accountPath, appId);

            if (!Directory.Exists(accountGamePath))
                continue;
            
            await CopyDirectoryAsync(new DirectoryInfo(referenceAccountGamePath), accountGamePath);
        }
    }

    private string[] GetAllProfileAccountIds(string profileName) =>
        Directory.Exists(Path.Combine(BackupRoot, profileName, "userdata"))
            ? Directory.GetDirectories(Path.Combine(BackupRoot, profileName, "userdata"))
            : [];

    private async Task CopyDirectoryAsync(DirectoryInfo sourceDir, string destDirName)
    {
        const int maxRetries = 10;
        const int delayMs = 1000;

        if (sourceDir.FullName.Equals(destDirName, StringComparison.OrdinalIgnoreCase))
            return;

        Directory.CreateDirectory(destDirName);

        foreach (var file in sourceDir.GetFiles())
        {
            var fileCopied = false;
            var attempts = 0;

            // ReSharper disable once ConditionIsAlwaysTrueOrFalse
            while (!fileCopied && attempts < maxRetries)
            {
                try
                {
                    file.CopyTo(Path.Combine(destDirName, file.Name), true);
                    fileCopied = true;
                    if (attempts > 0)
                        _logger.LogInformation($"Successfully copied {file.Name} after {attempts} attempts.");
                }
                catch (IOException ex)
                {
                    attempts++;
                    _logger.LogTrace($"Attempt {attempts} failed to copy {file.Name}: {ex.Message}");
                    if (attempts >= maxRetries)
                        throw new Exception($"Failed to copy file {file.Name} after {maxRetries} attempts.");
                    await Task.Delay(delayMs);
                }
            }
        }

        foreach (var directory in sourceDir.GetDirectories())
        {
            await CopyDirectoryAsync(directory, Path.Combine(destDirName, directory.Name));
        }
    }

    private async Task StartAppAsync(string appId)
    {
        var steamUrl = $"steam://rungameid/{appId}";

        var psi = new ProcessStartInfo
        {
            FileName = steamUrl,
            UseShellExecute = true
        };

        Process.Start(psi);
        _logger.LogInformation("Started app successfully.");
        await Task.CompletedTask;
    }

    private async Task<bool> TryCloseAppAsync(Process[] oldProcesses)
    {
        var diffProcesses = new List<Process>();
        for (var i = 0; i < 3; i++)
        {
            diffProcesses = Process.GetProcesses()
                .Where(p => oldProcesses.All(old => old.Id != p.Id))
                .ToList();
            if (diffProcesses.Count > 0) break;
            _logger.LogInformation($"Waiting for new processes to start ({i + 1}/3 seconds)");
            await Task.Delay(1000);
        }

        if (diffProcesses.Count == 0)
        {
            _logger.LogWarning("No new processes found.");
            return false;
        }

        var result = false;

        foreach (var process in diffProcesses)
        {
            try
            {
                if (process.ProcessName is "steam" or "steamwebhelper") continue;
                var parentProcessId = ProcessUtils.GetParentProcess(process.Id)?.Id ?? 0;
                var steamPid = Process.GetProcessesByName("steam").FirstOrDefault()?.Id ?? -1;
                if (parentProcessId != steamPid) continue;
                process.Kill();
                _logger.LogTrace($"Killed process: {process.ProcessName}");
                result = true;
            }
            catch (Exception ex)
            {
                _logger.LogInformation($"Error retrieving parent process ID for PID {process.Id}: {ex.Message}");
            }
        }

        if (result)
            _logger.LogInformation("App closed successfully.");
        else
            _logger.LogWarning("Failed to find app.");
        return result;
    }
}