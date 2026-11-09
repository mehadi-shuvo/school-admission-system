using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.Interfaces;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class ClassCreationApiTests
{
    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreatedNormalizedResponse()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/classes", new
        {
            name = "  Class 6 - Morning Shift  ",
            totalSeats = 120
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var root = document.RootElement;

        Assert.Equal(
            new[] { "id", "name", "totalSeats" },
            root.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("Class 6 - Morning Shift", root.GetProperty("name").GetString());
        Assert.Equal(120, root.GetProperty("totalSeats").GetInt32());

        var publicId = root.GetProperty("id").GetString();
        Assert.StartsWith("c_", publicId);
        Assert.True(PublicId.TryParseClassId(publicId, out var id));
        Assert.NotEqual(Guid.Empty, id);
    }

    [Theory]
    [InlineData("{\"name\":\"\",\"totalSeats\":10}")]
    [InlineData("{\"name\":\"   \",\"totalSeats\":10}")]
    [InlineData("{\"name\":null,\"totalSeats\":10}")]
    [InlineData("{\"totalSeats\":10}")]
    [InlineData("{\"name\":\"Class 7\"}")]
    public async Task Create_WithMissingOrInvalidRequiredProperties_ReturnsBadRequest(
        string body)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/classes", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Create_WithNonpositiveCapacity_ReturnsBadRequest(int totalSeats)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/classes", new
        {
            name = "Class 8",
            totalSeats
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithOverlongName_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/classes", new
        {
            name = new string('a', 151),
            totalSeats = 10
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithDuplicateNormalizedName_ReturnsConflict()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var initialResponse = await client.PostAsJsonAsync("/classes", new
        {
            name = "Class 9 - Day",
            totalSeats = 30
        });
        var duplicateResponse = await client.PostAsJsonAsync("/classes", new
        {
            name = "  Class 9 - Day  ",
            totalSeats = 30
        });

        Assert.Equal(HttpStatusCode.Created, initialResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
    }

    [Fact]
    public async Task Create_WithMalformedOrWrongTypedJson_ReturnsBadRequest()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        using var malformed = new StringContent(
            "{\"name\":\"Class 10\",",
            Encoding.UTF8,
            "application/json");
        var malformedResponse = await client.PostAsync("/classes", malformed);

        using var wrongTypes = new StringContent(
            "{\"name\":123,\"totalSeats\":\"many\"}",
            Encoding.UTF8,
            "application/json");
        var wrongTypeResponse = await client.PostAsync("/classes", wrongTypes);

        Assert.Equal(HttpStatusCode.BadRequest, malformedResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrongTypeResponse.StatusCode);
    }

    [Fact]
    public async Task Create_WhenServiceFails_ReturnsControlledServerError()
    {
        using var factory = new TestApiFactory().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IClassService>();
                services.AddScoped<IClassService, FailingClassService>();
            }));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/classes", new
        {
            name = "Class 11",
            totalSeats = 10
        });
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.DoesNotContain("Database connection details", body);
    }
}
