using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.DTOs.Classes;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class ClassListingApiTests
{
    [Fact]
    public async Task GetAll_WhenNoClassesExist_ReturnsOkWithEmptyArray()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/classes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("[]", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task GetAll_ReturnsTheExactSixPropertyAvailabilityContract()
    {
        using var factory = new TestApiFactory();
        factory.Services.GetRequiredService<TestClassService>().SetClasses(
            new ClassAvailabilityResponse("c_b", "Beta", 120, 15, 80, 25),
            new ClassAvailabilityResponse("c_a", "Alpha", 30, 0, 0, 30));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/classes");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var classes = document.RootElement;
        Assert.Equal(JsonValueKind.Array, classes.ValueKind);
        Assert.Equal(2, classes.GetArrayLength());

        var first = classes[0];
        Assert.Equal(
            new[]
            {
                "availableSeats",
                "confirmedSeats",
                "heldSeats",
                "id",
                "name",
                "totalSeats"
            },
            first.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("c_b", first.GetProperty("id").GetString());
        Assert.Equal(120, first.GetProperty("totalSeats").GetInt32());
        Assert.Equal(15, first.GetProperty("heldSeats").GetInt32());
        Assert.Equal(80, first.GetProperty("confirmedSeats").GetInt32());
        Assert.Equal(25, first.GetProperty("availableSeats").GetInt32());
    }
}
