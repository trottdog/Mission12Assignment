using Microsoft.EntityFrameworkCore;
using Mission11Assignment.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var bookstoreConnectionString = builder.Configuration.GetConnectionString("BookstoreConnection")
                               ?? throw new InvalidOperationException("Bookstore connection string is not configured.");

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
        policy.WithOrigins(allowedOrigins)
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
