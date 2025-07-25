namespace UnlinkNL.Executor.Util;

public class Options
{
    public string SelectedProfileName { get; private set; } = string.Empty;
    public string NewProfileName { get; private set; } = string.Empty;
    public string ToolPath { get; private set; } = string.Empty;
    public string SteamPath { get; private set; } = string.Empty;
    public string AppId { get; private set; } = "0";
    public string RefProfileName { get; private set; } = string.Empty;
    public string RefAccountId { get; private set; } = string.Empty;
    public string RemoveProfileName { get; private set; } = string.Empty;
    public string RemoveAccountId { get; private set; } = string.Empty;
    public bool GetSelectedProfile { get; private set; }
    public bool GetSteamPath { get; private set; }
    public bool AutoCopySettings { get; private set; }
    public bool TerminateSteam { get; private set; }
    public bool ChangeHwid { get; private set; }
    public bool RandomMacs { get; private set; }
    public bool CleanRegedit { get; private set; }
    public bool ChangeMguid { get; private set; }
    public bool StartSteamService { get; private set; }
    public bool PerformUnlink { get; private set; }

    public static Options ParseArgs(string[] args)
    {
        var result = new Options();

        foreach (var arg in args)
        {
            if (arg.StartsWith("--selectedProfileName="))
                result.SelectedProfileName = GetValue(arg);

            if (arg.StartsWith("--newProfileName="))
                result.NewProfileName = GetValue(arg);

            if (arg.StartsWith("--appId="))
                result.AppId = GetValue(arg);

            if (arg.StartsWith("--toolPath="))
                result.ToolPath = GetValue(arg);

            if (arg.StartsWith("--steamPath="))
                result.SteamPath = GetValue(arg);

            if (arg.StartsWith("--refAccountId="))
                result.RefAccountId = GetValue(arg);

            if (arg.StartsWith("--refProfileName="))
                result.RefProfileName = GetValue(arg);
            
            if (arg.StartsWith("--removeProfileName="))
                result.RemoveProfileName = GetValue(arg);
            
            if (arg.StartsWith("--removeAccountId="))
                result.RemoveAccountId = GetValue(arg);

            switch (arg)
            {
                case "--getSelectedProfile":
                    result.GetSelectedProfile = true;
                    break;
                case "--getSteamPath":
                    result.GetSteamPath = true;
                    break;
                case "--autoCopySettings":
                    result.AutoCopySettings = true;
                    break;
                case "--terminateSteam":
                    result.TerminateSteam = true;
                    break;
                case "--changeHwid":
                    result.ChangeHwid = true;
                    break;
                case "--randomMacs":
                    result.RandomMacs = true;
                    break;
                case "--cleanRegedit":
                    result.CleanRegedit = true;
                    break;
                case "--changeMguid":
                    result.ChangeMguid = true;
                    break;
                case "--startSteamService":
                    result.StartSteamService = true;
                    break;
                case "--performUnlink":
                    result.PerformUnlink = true;
                    break;
            }
        }

        return result;
    }
    
    private static string GetValue(string arg)
    {
        var value = arg.Split("=")[1];
        if (value.EndsWith('"'))
            value = value.TrimEnd('"');
        if (value.StartsWith('"'))
            value = value.TrimStart('"');
        return value;
    }
}