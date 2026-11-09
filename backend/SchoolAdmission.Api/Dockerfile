# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0.403-noble AS build
WORKDIR /src

# Copy project metadata first so package restore remains cacheable.
COPY backend/SchoolAdmission.Api/SchoolAdmission.Api.csproj backend/SchoolAdmission.Api/
RUN dotnet restore backend/SchoolAdmission.Api/SchoolAdmission.Api.csproj

COPY backend/SchoolAdmission.Api/ backend/SchoolAdmission.Api/
RUN dotnet publish backend/SchoolAdmission.Api/SchoolAdmission.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.14-noble AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true

COPY --from=build /app/publish ./

# The official .NET images provide APP_UID for the built-in non-root app user.
USER $APP_UID
EXPOSE 8080

ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
