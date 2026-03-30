namespace Mission11Assignment.Models;

public class PagedBooksResponse
{
    public IReadOnlyList<Book> Books { get; init; } = [];
    public int TotalBooks { get; init; }
    public int TotalPages { get; init; }
    public int CurrentPage { get; init; }
    public int PageSize { get; init; }
    public string SortOrder { get; init; } = "title-asc";
    public string? Category { get; init; }
}
