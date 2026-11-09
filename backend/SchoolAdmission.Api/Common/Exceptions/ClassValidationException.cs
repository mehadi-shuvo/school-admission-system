namespace SchoolAdmission.Api.Common.Exceptions;

public sealed class ClassValidationException : Exception
{
    public ClassValidationException(string key, string message)
        : base(message)
    {
        Key = key;
    }

    public string Key { get; }
}
