using System.Diagnostics.CodeAnalysis;
using System.Net.NetworkInformation;
using Microsoft.Win32;
using UnlinkNL.Executor.Util;

namespace UnlinkNL.Executor.Services;

[SuppressMessage("Interoperability", "CA1416:Validate platform compatibility")]
public class RegistryService
{
    private readonly ILogger _logger;

    public RegistryService(ILogger logger)
    {
        _logger = logger;
    }

    public string? GetSteamPath()
    {
        string? steamPath;
        
        using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam"))
        {
            steamPath = key?.GetValue("SteamPath") as string;
        }
        
        if (string.IsNullOrWhiteSpace(steamPath))
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Valve\Steam");
            steamPath = key?.GetValue("InstallPath") as string;
        }

        return string.IsNullOrWhiteSpace(steamPath)
            ? null
            : steamPath;
    }

    public void CleanRegedit()
    {
        try
        {
            DeleteKey(Registry.CurrentUser, @"Software\Valve\Steam");
            DeleteKey(Registry.LocalMachine, @"SOFTWARE\Valve\Steam");
            DeleteKey(Registry.LocalMachine, @"SOFTWARE\WOW6432Node\Valve\Steam");
            
            _logger.LogInformation("Deleted registry keys.");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Can't clean regedit: {ex.Message}");
        }
    }

    public void ChangeMguid()
    {
        const string cryptographyLocation = @"SOFTWARE\Microsoft\Cryptography";
        using var cryptography = Registry.LocalMachine.OpenSubKey(cryptographyLocation, true);
        if (cryptography?.GetValue("MachineGuid") is null) return;
        var newMguid = Guid.NewGuid().ToString().ToLower();
        cryptography.SetValue("MachineGuid", newMguid);
        _logger.LogTrace($"New MachineGuid: {newMguid}");
        _logger.LogInformation("Randomized Machine GUID.");
    }

    public void RandomizeMacs()
    {
        foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (nic.NetworkInterfaceType != NetworkInterfaceType.Ethernet ||
                nic.OperationalStatus != OperationalStatus.Up) continue;
            _logger.LogTrace($"NIC: {nic.Description} ({nic.Id})");
            _logger.LogTrace($"Current MAC: {nic.GetPhysicalAddress()}");
            UpdateNic(nic, GenerateRandomMacAddress());
        }
        _logger.LogInformation("Randomized MAC addresses.");
    }
    
    private void UpdateNic(NetworkInterface nic, string newMac)
    {
        try
        {
            const string networkAdaptersLocation = @"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}";
            using var networkAdapters = Registry.LocalMachine.OpenSubKey(networkAdaptersLocation, true);
            if (networkAdapters is null)
            {
                _logger.LogError("Can't open network adapters in regedit");
                return;
            }

            foreach (var subKeyName in networkAdapters.GetSubKeyNames())
            {
                using var adapterKey = networkAdapters.OpenSubKey(subKeyName, true);

                var netCfgInstanceId = adapterKey?.GetValue("NetCfgInstanceId");
                if (netCfgInstanceId is null) continue;

                if (nic.Id != netCfgInstanceId.ToString()) continue;
                
                _logger.LogTrace($"Adapter {subKeyName}. NetCfgInstanceId: {netCfgInstanceId}");
                adapterKey?.SetValue("NetworkAddress", newMac);
                _logger.LogTrace($"New mac address: {newMac}");
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogTrace($"Can't change registry: {ex.Message}");
        }
    }

    private void DeleteKey(RegistryKey root, string subKeyPath)
    {
        try
        {
            using var key = root.OpenSubKey(subKeyPath, true);
            if (key is null)
            {
                _logger.LogTrace($"Key not found: {root.Name}\\{subKeyPath}");
                return;
            }
            
            root.DeleteSubKeyTree(subKeyPath);
            _logger.LogTrace($"Deleted: {root.Name}\\{subKeyPath}");
        }
        catch (Exception ex)
        {
            _logger.LogTrace($"Failed to delete {root.Name}\\{subKeyPath}: {ex.Message}");
        }
    }

    private static string GenerateRandomMacAddress(bool firstOctetIs02 = true)
    {
        var random = new Random();
        var buffer = new byte[6];
        random.NextBytes(buffer);
        buffer[0] = firstOctetIs02 ? (byte)0x02 : (byte)0x00;
        return string.Join("", buffer.Select(x => x.ToString("X2")));
    }
}