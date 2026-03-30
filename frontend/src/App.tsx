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
  category?: string | null
}

type CartItem = {
  book: Book
  quantity: number
}

type CatalogView = 'catalog' | 'cart'

type CatalogState = {
  currentPage: number
  pageSize: number
  sortOrder: 'title-asc' | 'title-desc'
  selectedCategory: string
}

const pageSizeOptions = [5, 10, 15]
const catalogStorageKey = 'mission12.catalog'
const cartStorageKey = 'mission12.cart'
const viewStorageKey = 'mission12.view'

const defaultCatalogState: CatalogState = {
  currentPage: 1,
  pageSize: 5,
  sortOrder: 'title-asc',
  selectedCategory: '',
}

const formatCurrency = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)

const readSessionValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.sessionStorage.getItem(key)

  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

function App() {
  const savedCatalogState = readSessionValue<CatalogState>(
    catalogStorageKey,
    defaultCatalogState,
  )

  const [booksResponse, setBooksResponse] = useState<BooksResponse | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(savedCatalogState.currentPage)
  const [pageSize, setPageSize] = useState(savedCatalogState.pageSize)
  const [sortOrder, setSortOrder] = useState<'title-asc' | 'title-desc'>(
    savedCatalogState.sortOrder,
  )
  const [selectedCategory, setSelectedCategory] = useState(
    savedCatalogState.selectedCategory,
  )
  const [cart, setCart] = useState<CartItem[]>(
    readSessionValue<CartItem[]>(cartStorageKey, []),
  )
  const [view, setView] = useState<CatalogView>(
    readSessionValue<CatalogView>(viewStorageKey, 'catalog'),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  useEffect(() => {
    window.sessionStorage.setItem(
      catalogStorageKey,
      JSON.stringify({
        currentPage,
        pageSize,
        sortOrder,
        selectedCategory,
      } satisfies CatalogState),
    )
  }, [currentPage, pageSize, selectedCategory, sortOrder])

  useEffect(() => {
    window.sessionStorage.setItem(cartStorageKey, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    window.sessionStorage.setItem(viewStorageKey, JSON.stringify(view))
  }, [view])

  useEffect(() => {
    const abortController = new AbortController()

    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true)
        setCategoryError(null)

        const response = await fetch('/api/books/categories', {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load categories.')
        }

        const data = (await response.json()) as string[]
        setCategories(data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        setCategoryError('Categories are unavailable right now.')
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()

    return () => abortController.abort()
  }, [])

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

        if (selectedCategory) {
          query.set('category', selectedCategory)
        }

        const response = await fetch(`/api/books?${query.toString()}`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load books right now.')
        }

        const data = (await response.json()) as BooksResponse
        setBooksResponse(data)

        if (data.currentPage !== currentPage) {
          setCurrentPage(data.currentPage)
        }
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
  }, [currentPage, pageSize, selectedCategory, sortOrder])

  const totalPages = booksResponse?.totalPages ?? 0
  const visiblePages = booksResponse
    ? Array.from({ length: booksResponse.totalPages }, (_, index) => index + 1)
    : []
  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0)
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.book.price * item.quantity,
    0,
  )
  const cartAveragePrice =
    totalCartItems === 0 ? 0 : Number((cartSubtotal / totalCartItems).toFixed(2))
  const cartCompletion = Math.min((totalCartItems / 5) * 100, 100)

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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
  }

  const addToCart = (book: Book) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.book.bookId === book.bookId)

      if (!existingItem) {
        return [...currentCart, { book, quantity: 1 }]
      }

      return currentCart.map((item) =>
        item.book.bookId === book.bookId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    })
  }

  const updateQuantity = (bookId: number, change: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.book.bookId === bookId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (bookId: number) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.book.bookId !== bookId),
    )
  }

  const continueShopping = () => {
    setView('catalog')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="catalog-shell container-fluid px-0">
      <section className="hero-panel shadow-sm">
        <div className="d-flex flex-column gap-2">
          <p className="eyebrow">Mission 12 Bookstore</p>
          <h1 className="display-5 fw-semibold mb-0">Online Book Catalog</h1>
          <p className="lead text-secondary mb-0">
            Filter the catalog, add books to your cart, and pick up shopping
            right where you left off.
          </p>
        </div>
        <div className="summary-card">
          <span className="summary-label">Catalog Size</span>
          <strong>{booksResponse?.totalBooks ?? 0} books</strong>
          <span className="small opacity-75">
            {selectedCategory || 'All categories'}
          </span>
        </div>
      </section>

      <div className="row g-4 align-items-start">
        <aside className="col-12 col-xl-4">
          <div className="sidebar-stack sticky-xl-top">
            <section className="controls-panel shadow-sm">
              <div
                className="accordion mission-accordion"
                id="shoppingControlsAccordion"
              >
                <div className="accordion-item border-0">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#filters-panel"
                      aria-expanded="true"
                      aria-controls="filters-panel"
                    >
                      Catalog Filters
                    </button>
                  </h2>
                  <div
                    id="filters-panel"
                    className="accordion-collapse collapse show"
                    data-bs-parent="#shoppingControlsAccordion"
                  >
                    <div className="accordion-body px-0 pb-0">
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label" htmlFor="category">
                            Category
                          </label>
                          <select
                            id="category"
                            className="form-select"
                            value={selectedCategory}
                            onChange={(event) =>
                              handleCategoryChange(event.target.value)
                            }
                          >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <div className="form-text">
                            {isLoadingCategories
                              ? 'Loading categories...'
                              : categoryError ?? 'Choose a category to refine the list.'}
                          </div>
                        </div>

                        <div className="col-sm-6">
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

                        <div className="col-sm-6">
                          <label className="form-label d-block">
                            Sort direction
                          </label>
                          <button
                            type="button"
                            className="btn btn-outline-primary w-100"
                            onClick={handleSortToggle}
                          >
                            {sortOrder === 'title-asc'
                              ? 'Title A-Z'
                              : 'Title Z-A'}
                          </button>
                        </div>

                        <div className="col-12">
                          <div className="status-chip">
                            Page {booksResponse?.currentPage ?? 1} of {totalPages || 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="content-panel shadow-sm">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <p className="section-kicker">Cart Summary</p>
                  <h2 className="h4 mb-1">Session Cart</h2>
                  <p className="text-secondary mb-0">
                    Your selections stay here while you browse this session.
                  </p>
                </div>
                <span className="badge text-bg-warning rounded-pill px-3 py-2">
                  {totalCartItems} items
                </span>
              </div>

              <div className="summary-grid">
                <div className="summary-tile">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(cartSubtotal)}</strong>
                </div>
                <div className="summary-tile">
                  <span>Average Price</span>
                  <strong>{formatCurrency(cartAveragePrice)}</strong>
                </div>
              </div>

              <div className="mt-3">
                <div className="d-flex justify-content-between small text-secondary mb-2">
                  <span>Reading goal progress</span>
                  <span>{Math.round(cartCompletion)}%</span>
                </div>
                <div
                  className="progress mission-progress"
                  role="progressbar"
                  aria-label="Cart goal progress"
                  aria-valuenow={Math.round(cartCompletion)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${cartCompletion}%` }}
                  />
                </div>
              </div>

              <div className="list-group list-group-flush mt-4">
                {cart.length === 0 ? (
                  <div className="list-group-item px-0 text-secondary">
                    Your cart is empty right now.
                  </div>
                ) : (
                  cart.slice(0, 3).map((item) => (
                    <div
                      key={item.book.bookId}
                      className="list-group-item px-0 d-flex justify-content-between gap-3"
                    >
                      <div>
                        <div className="fw-semibold">{item.book.title}</div>
                        <div className="small text-secondary">
                          Qty {item.quantity}
                        </div>
                      </div>
                      <div className="fw-semibold">
                        {formatCurrency(item.book.price * item.quantity)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="d-grid gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setView('cart')}
                >
                  View Cart
                </button>
                {view === 'cart' ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={continueShopping}
                  >
                    Continue Shopping
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        </aside>

        <section className="col-12 col-xl-8">
          {view === 'cart' ? (
            <section className="content-panel shadow-sm">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <p className="section-kicker">Shopping Cart</p>
                  <h2 className="h3 mb-1">Review Your Books</h2>
                  <p className="text-secondary mb-0">
                    Update quantities, review totals, or jump back to the page
                    you were shopping on.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={continueShopping}
                >
                  Continue Shopping
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="alert alert-info mb-0" role="alert">
                  Your cart is empty. Add a few books, then come back here to
                  review your order.
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col">Book</th>
                          <th scope="col">Price</th>
                          <th scope="col">Quantity</th>
                          <th scope="col">Subtotal</th>
                          <th scope="col" className="text-end">
                            Remove
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr key={item.book.bookId}>
                            <td>
                              <div className="fw-semibold">{item.book.title}</div>
                              <div className="small text-secondary">
                                {item.book.author} • {item.book.category}
                              </div>
                            </td>
                            <td>{formatCurrency(item.book.price)}</td>
                            <td>
                              <div
                                className="btn-group btn-group-sm"
                                role="group"
                                aria-label={`Quantity controls for ${item.book.title}`}
                              >
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() =>
                                    updateQuantity(item.book.bookId, -1)
                                  }
                                >
                                  -
                                </button>
                                <span className="btn btn-light disabled">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() =>
                                    updateQuantity(item.book.bookId, 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>
                              {formatCurrency(item.book.price * item.quantity)}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeFromCart(item.book.bookId)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="cart-total-bar mt-4">
                    <div>
                      <span className="text-secondary d-block">Total Items</span>
                      <strong>{totalCartItems}</strong>
                    </div>
                    <div>
                      <span className="text-secondary d-block">Order Total</span>
                      <strong>{formatCurrency(cartSubtotal)}</strong>
                    </div>
                  </div>
                </>
              )}
            </section>
          ) : isLoading ? (
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
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                  <div>
                    <p className="section-kicker">Book List</p>
                    <h2 className="h3 mb-1">Available Titles</h2>
                    <p className="text-secondary mb-0">
                      {selectedCategory
                        ? `Showing books in ${selectedCategory}.`
                        : 'Showing books from every category.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setView('cart')}
                  >
                    Go To Cart
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Title</th>
                        <th scope="col">Author</th>
                        <th scope="col">Publisher</th>
                        <th scope="col">Category</th>
                        <th scope="col">Pages</th>
                        <th scope="col">Price</th>
                        <th scope="col" className="text-end">
                          Cart
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {booksResponse?.books.map((book) => (
                        <tr key={book.bookId}>
                          <td>
                            <div className="fw-semibold">{book.title}</div>
                            <div className="small text-secondary">{book.isbn}</div>
                          </td>
                          <td>{book.author}</td>
                          <td>{book.publisher}</td>
                          <td>
                            <span className="badge text-bg-light border">
                              {book.category}
                            </span>
                          </td>
                          <td>{book.pageCount}</td>
                          <td>{formatCurrency(book.price)}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => addToCart(book)}
                            >
                              Add to Cart
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="pagination-panel">
                <nav aria-label="Book catalog pagination">
                  <ul className="pagination justify-content-center flex-wrap mb-0">
                    <li
                      className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() =>
                          setCurrentPage((page) => Math.max(page - 1, 1))
                        }
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
                        currentPage === totalPages || totalPages === 0
                          ? 'disabled'
                          : ''
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
        </section>
      </div>
    </main>
  )
}

export default App
