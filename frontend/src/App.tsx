import { useEffect, useState } from 'react'
import './App.css'

type Book = {
  bookId: number
  title: string
  author: string
  publisher: string
  isbn: string
  classification: string
  category: string
  pageCount: number
  price: number
}

type BooksResponse = {
  books: Book[]
  totalBooks: number
  totalPages: number
  currentPage: number
  pageSize: number
  sortOrder: string
}

const pageSizeOptions = [5, 10, 15]

const formatCurrency = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)

function App() {
  const [booksResponse, setBooksResponse] = useState<BooksResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortOrder, setSortOrder] = useState<'title-asc' | 'title-desc'>(
    'title-asc',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    const loadBooks = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const query = new URLSearchParams({
          pageNumber: currentPage.toString(),
          pageSize: pageSize.toString(),
          sortOrder,
        })

        const response = await fetch(`/api/books?${query.toString()}`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load books right now.')
        }

        const data = (await response.json()) as BooksResponse
        setBooksResponse(data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        setError('We could not load the bookstore catalog. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadBooks()

    return () => abortController.abort()
  }, [currentPage, pageSize, sortOrder])

  const totalPages = booksResponse?.totalPages ?? 0
  const visiblePages = booksResponse
    ? Array.from({ length: booksResponse.totalPages }, (_, index) => index + 1)
    : []

  const handlePageSizeChange = (value: number) => {
    setPageSize(value)
    setCurrentPage(1)
  }

  const handleSortToggle = () => {
    setSortOrder((current) =>
      current === 'title-asc' ? 'title-desc' : 'title-asc',
    )
    setCurrentPage(1)
  }

  return (
    <main className="catalog-shell">
      <section className="hero-panel shadow-sm">
        <div>
          <p className="eyebrow">Mission 11 Bookstore</p>
          <h1 className="display-5 fw-semibold mb-3">Online Book Catalog</h1>
          <p className="lead text-secondary mb-0">
            Browse a curated bookstore collection
          </p>
        </div>
        <div className="summary-card">
          <span className="summary-label">Catalog Size</span>
          <strong>{booksResponse?.totalBooks ?? 0} books</strong>
        </div>
      </section>

      <section className="controls-panel shadow-sm">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label" htmlFor="pageSize">
              Results per page
            </label>
            <select
              id="pageSize"
              className="form-select"
              value={pageSize}
              onChange={(event) =>
                handlePageSizeChange(Number(event.target.value))
              }
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} books
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              onClick={handleSortToggle}
            >
              Sort by title: {sortOrder === 'title-asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>
          <div className="col-md-4">
            <div className="status-chip">
              Page {booksResponse?.currentPage ?? 1} of {totalPages || 1}
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="content-panel shadow-sm">
          <div className="py-5 text-center text-secondary">Loading books...</div>
        </section>
      ) : error ? (
        <section className="content-panel shadow-sm">
          <div className="alert alert-danger mb-0" role="alert">
            {error}
          </div>
        </section>
      ) : (
        <>
          <section className="content-panel shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Author</th>
                    <th scope="col">Publisher</th>
                    <th scope="col">ISBN</th>
                    <th scope="col">Classification</th>
                    <th scope="col">Category</th>
                    <th scope="col">Pages</th>
                    <th scope="col">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {booksResponse?.books.map((book) => (
                    <tr key={book.bookId}>
                      <td className="fw-semibold">{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.publisher}</td>
                      <td>{book.isbn}</td>
                      <td>{book.classification}</td>
                      <td>{book.category}</td>
                      <td>{book.pageCount}</td>
                      <td>{formatCurrency(book.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pagination-panel">
            <nav aria-label="Book catalog pagination">
              <ul className="pagination justify-content-center flex-wrap mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  >
                    Previous
                  </button>
                </li>
                {visiblePages.map((page) => (
                  <li
                    key={page}
                    className={`page-item ${
                      page === (booksResponse?.currentPage ?? currentPage)
                        ? 'active'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((page) =>
                        totalPages === 0 ? page : Math.min(page + 1, totalPages),
                      )
                    }
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </section>
        </>
      )}
    </main>
  )
}

export default App
