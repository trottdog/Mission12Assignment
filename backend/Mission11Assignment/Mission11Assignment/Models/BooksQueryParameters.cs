namespace Mission11Assignment.Models;

public class BooksQueryParameters
{
    private const int MaxPageSize = 20;
    private int _pageSize = 5;

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value switch
        {
            < 1 => 5,
            > MaxPageSize => MaxPageSize,
            _ => value
        };
    }

    public string SortOrder { get; set; } = "title-asc";
    public string? Category { get; set; }
}
