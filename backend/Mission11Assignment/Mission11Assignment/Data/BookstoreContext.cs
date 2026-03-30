using Microsoft.EntityFrameworkCore;
using Mission11Assignment.Models;

namespace Mission11Assignment.Data;

public class BookstoreContext(DbContextOptions<BookstoreContext> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Book>(entity =>
        {
            entity.HasKey(book => book.BookId);

            entity.Property(book => book.BookId).HasColumnName("BookID");
            entity.Property(book => book.Title).IsRequired();
            entity.Property(book => book.Author).IsRequired();
            entity.Property(book => book.Publisher).IsRequired();
            entity.Property(book => book.ISBN).IsRequired();
            entity.Property(book => book.Classification).IsRequired();
            entity.Property(book => book.Category).IsRequired();
            entity.Property(book => book.PageCount).IsRequired();
            entity.Property(book => book.Price).HasColumnType("REAL").IsRequired();
        });
    }
}
