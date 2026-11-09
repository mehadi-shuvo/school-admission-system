namespace SchoolAdmission.Api.Common.Exceptions;

public sealed class ClassNameConflictException : Exception
{
    public ClassNameConflictException()
        : base("An admission class with this name already exists.")
    {
    }
}
