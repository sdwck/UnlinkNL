using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Security.Principal;
using UnlinkNL.Executor.Util;

namespace UnlinkNL.Executor.Services;

public class ElevatorService
{
    private readonly ILogger _logger;
    
    public ElevatorService(ILogger logger)
    {
        _logger = logger;
    }
    
    [SuppressMessage("Interoperability", "CA1416:Validate platform compatibility")]
    public bool IsRunningAsAdministrator()
    {
        var identity = WindowsIdentity.GetCurrent();
        var principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }

    public void RestartAsAdmin()
    {
        var exeName = Process.GetCurrentProcess().MainModule?.FileName;
        if (string.IsNullOrWhiteSpace(exeName))
        {
            _logger.LogError("Cannot determine executable path.");
            Environment.Exit(1);
        }
        
        var args = string.Join(" ", Environment.GetCommandLineArgs().Skip(1).Select(arg => $"\"{arg}\""));
        var startInfo = new ProcessStartInfo(exeName)
        {
            UseShellExecute = true,
            Verb = "runas",
            Arguments = args
        };

        try
        {
            Process.Start(startInfo);
        }
        catch
        {
            // ignored
        }

        Environment.Exit(0);
    }
}