using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Common;
using SchoolAdmission.Api.DTOs.Classes;
using Xunit;

namespace SchoolAdmission.Api.Tests;

public sealed class ClassDetailsApiTests
{
    [Fact]
    public async Task GetById_WithExistingClass_ReturnsExactAvailabilityContract()
    {
        using var factory = new TestApiFactory();
        var id = Guid.Parse("5f7ec501-a098-4a2f-bdfd-1a713b1266f2");
        var publicId = PublicId.ForClass(id);
        factory.Services.GetRequiredService<TestClassService>().SetClassDetails(
            new ClassAvailabilityResponse(publicId, "Class 6", 120, 15, 80, 25));
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/classes/{publicId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var admissionClass = document.RootElement;
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
            admissionClass.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal(publicId, admissionClass.GetProperty("id").GetString());
        Assert.Equal(15, admissionClass.GetProperty("heldSeats").GetInt32());
        Assert.Equal(80, admissionClass.GetProperty("confirmedSeats").GetInt32());
        Assert.Equal(25, admissionClass.GetProperty("availableSeats").GetInt32());
    }

    [Fact]
    public async Task GetById_WithValidUnknownId_ReturnsNotFound()
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            "/classes/c_00000000000040008000000000000000");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("h_5f7ec501a0984a2fbdfd1a713b1266f2")]
    [InlineData("c_not-a-uuid")]
    [InlineData("invalid-id")]
    [InlineData("c_")]
    public async Task GetById_WithMalformedId_ReturnsBadRequest(string classId)
    {
        using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/classes/{classId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetById_AndGetAll_ReturnConsistentAvailability()
    {
        using var factory = new TestApiFactory();
        var id = Guid.Parse("4ff7ec50-1a09-4a2f-bdfd-1a713b1266f2");
        var response = new ClassAvailabilityResponse(
            PublicId.ForClass(id), "Class 7", 20, 2, 3, 15);
        var service = factory.Services.GetRequiredService<TestClassService>();
        service.SetClasses(response);
        service.SetClassDetails(response);
        using var client = factory.CreateClient();

        var listResponse = await client.GetFromJsonAsync<ClassAvailabilityResponse[]>(
            "/classes");
        var detailResponse = await client.GetFromJsonAsync<ClassAvailabilityResponse>(
            $"/classes/{response.Id}");

        Assert.NotNull(listResponse);
        Assert.NotNull(detailResponse);
        Assert.Equal(listResponse[0], detailResponse);
    }
}
