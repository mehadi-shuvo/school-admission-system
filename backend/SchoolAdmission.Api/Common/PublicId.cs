
namespace SchoolAdmission.Api.Common;

public static class PublicId
{
    public static string ForClass(Guid id)
    {
        return $"c_{id:N}";
    }

    public static string ForHold(Guid id)
    {
        return $"h_{id:N}";
    }

    public static bool TryParseClassId(string? value, out Guid id)
    {
        return TryParse(value, "c_", out id);
    }

    public static bool TryParseHoldId(string? value, out Guid id)
    {
        return TryParse(value, "h_", out id);
    }

    private static bool TryParse(
        string? value,
        string prefix,
        out Guid id)
    {
        id = Guid.Empty;

        if (string.IsNullOrWhiteSpace(value) ||
            !value.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        var rawId = value[prefix.Length..];

        return rawId.Length == 32 &&
               Guid.TryParseExact(rawId, "N", out id);
    }
}
