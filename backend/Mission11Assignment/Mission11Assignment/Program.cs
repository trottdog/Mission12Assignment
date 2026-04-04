using Microsoft.EntityFrameworkCore;
using Mission11Assignment.Data;
using System.Data.Common;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var rawConnectionString = builder.Configuration.GetConnectionString("BookstoreConnection")
                               ?? throw new InvalidOperationException("Bookstore connection string is not configured.");

var connectionStringBuilder = new DbConnectionStringBuilder
{
    ConnectionString = rawConnectionString
};

if (connectionStringBuilder.TryGetValue("Data Source", out var dataSourceValue)
    && dataSourceValue is string dataSource
    && !string.IsNullOrWhiteSpace(dataSource)
    && !Path.IsPathRooted(dataSource))
{
    connectionStringBuilder["Data Source"] = Path.Combine(builder.Environment.ContentRootPath, dataSource);
}

var bookstoreConnectionString = connectionStringBuilder.ConnectionString;

builder.Services.AddControllers();
builder.Services.AddDbContext<BookstoreContext>(options =>
    options.UseSqlite(bookstoreConnectionString));

var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)
            || origin.EndsWith(".azurestaticapps.net", StringComparison.OrdinalIgnoreCase))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
