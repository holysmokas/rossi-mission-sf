import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwgA9T5fgktO-QmesQoQCnF0wN9MIBi5jYLEhR8QixyRyNntL1Bpq52TRlLS7Csxbm79g/exec'; 

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(APPS_SCRIPT_URL);
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #f43f5e, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Rossi Mission SF
            </h1>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/" style={{
              color: '#374151',
              fontWeight: '500',
              textDecoration: 'none'
            }}>Shop</Link>
            <Link to="/about" style={{
              color: '#374151',
              fontWeight: '500',
              textDecoration: 'none'
            }}>About</Link>
            <button style={{
              padding: '0.5rem 1rem',
              background: '#f43f5e',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              <Link to="/login">
                <button style={{
                  padding: '0.5rem 1rem',
                  background: '#f43f5e',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}>
                  Sign In
                </button>
              </Link>
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3.75rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            New Rossi 2025 Original
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            maxWidth: '42rem',
            margin: '0 auto'
          }}>
            Discover our exclusive collection of premium products
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '3rem',
                height: '3rem',
                border: '4px solid #f43f5e',
                borderRightColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem'
              }}></div>
              <p style={{ color: '#6b7280' }}>Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
              No products available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {products.map((product, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#f3f4f6',
                  height: '16rem'
                }}>
                  <img
                    src={product.image || 'https://via.placeholder.com/400x400?text=Product'}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {product.isNew && (
                    <span style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: '#f43f5e',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px'
                    }}>
                      NEW
                    </span>
                  )}
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '0.5rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {product.name}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {product.description}
                  </p>

                  {product.price && (
                    <p style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#f43f5e',
                      marginBottom: '1rem'
                    }}>
                      ${product.price}
                    </p>
                  )}

                  <a
                    href={product.stripeLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '0.75rem 1rem',
                      background: 'linear-gradient(to right, #f43f5e, #ec4899)',
                      color: 'white',
                      fontWeight: '600',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      transition: 'all 0.3s'
                    }}
                  >
                    Buy Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#111827',
        color: 'white',
        padding: '2rem',
        marginTop: '4rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p style={{ color: '#9ca3af' }}>© 2025 Rossi Mission SF. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;