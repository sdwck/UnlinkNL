using System.Text.Json.Serialization;

namespace UnlinkNL.Executor.Util;

[JsonSerializable(typeof(Options), TypeInfoPropertyName = "Main")]
internal partial class JsonSourceGenerationContext : JsonSerializerContext;