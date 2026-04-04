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

    [HttpGet("all")]
    public async Task<ActionResult<IReadOnlyList<Book>>> GetAllBooks()
    {
        var books = await context.Books
            .AsNoTracking()
            .OrderBy(book => book.Title)
            .ToListAsync();

        return Ok(books);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Book>> GetBook(int id)
    {
        var book = await context.Books
            .AsNoTracking()
            .FirstOrDefaultAsync(book => book.BookId == id);

        return book is null ? NotFound() : Ok(book);
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

    [HttpPost]
    public async Task<ActionResult<Book>> AddBook([FromBody] Book book)
    {
        context.Books.Add(book);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBook), new { id = book.BookId }, book);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateBook(int id, [FromBody] Book updatedBook)
    {
        if (id != updatedBook.BookId)
        {
            return BadRequest("Book ID does not match the route.");
        }

        var existingBook = await context.Books.FindAsync(id);

        if (existingBook is null)
        {
            return NotFound();
        }

        existingBook.Title = updatedBook.Title;
        existingBook.Author = updatedBook.Author;
        existingBook.Publisher = updatedBook.Publisher;
        existingBook.ISBN = updatedBook.ISBN;
        existingBook.Classification = updatedBook.Classification;
        existingBook.Category = updatedBook.Category;
        existingBook.PageCount = updatedBook.PageCount;
        existingBook.Price = updatedBook.Price;

        await context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBook(int id)
    {
        var book = await context.Books.FindAsync(id);

        if (book is null)
        {
            return NotFound();
        }

        context.Books.Remove(book);
        await context.SaveChangesAsync();

        return NoContent();
    }
}
