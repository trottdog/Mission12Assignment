using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11Assignment.Data;
using Mission11Assignment.Models;

namespace Mission11Assignment.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BooksController(BookstoreContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedBooksResponse>> GetBooks([FromQuery] BooksQueryParameters queryParameters)
    {
        var booksQuery = context.Books.AsNoTracking();

        // Filter the catalog before counting pages.
        if (!string.IsNullOrWhiteSpace(queryParameters.Category))
        {
            var selectedCategory = queryParameters.Category.Trim();
            booksQuery = booksQuery.Where(book => book.Category == selectedCategory);
        }

        booksQuery = queryParameters.SortOrder.ToLowerInvariant() switch
        {
            "title-desc" => booksQuery.OrderByDescending(book => book.Title),
            _ => booksQuery.OrderBy(book => book.Title)
        };

        var totalBooks = await booksQuery.CountAsync();
        var pageSize = queryParameters.PageSize;
        var totalPages = (int)Math.Ceiling(totalBooks / (double)pageSize);

        // Keep the requested page number inside the valid range.
        var currentPage = totalPages == 0
            ? 1
            : Math.Min(Math.Max(queryParameters.PageNumber, 1), totalPages);

        var books = await booksQuery
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedBooksResponse
        {
            Books = books,
            TotalBooks = totalBooks,
            TotalPages = totalPages,
            CurrentPage = currentPage,
            PageSize = pageSize,
            SortOrder = queryParameters.SortOrder,
            Category = queryParameters.Category
        });
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetCategories()
    {
        // Send back a clean category list for the filter dropdown.
        var categories = await context.Books
            .AsNoTracking()
            .Select(book => book.Category)
            .Distinct()
            .OrderBy(category => category)
            .ToListAsync();

        return Ok(categories);
    }
}
