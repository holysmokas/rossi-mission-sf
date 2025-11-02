import React, { useState, useEffect } from 'react';

// ✅ Use your real Apps Script deployment ID
const proxyUrl = 'https://corsproxy.io/?';
const APPS_SCRIPT_URL =
    proxyUrl +
    'https://script.google.com/macros/s/AKfycbxCYF_V6khy6CqF69v14kS0dzZpjVaoC_e76Eh4m4zIs1n2OE5HWY99cy0_PzQqnaMk5w/exec';

function Admin() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image: '',
        stripeLink: '',
        paymentLink: '',
        soldOut: false,
        isNew: false,
    });

    // =====================================================
    // LOAD PRODUCTS
    // =====================================================
    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            setLoading(true);
            const res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getProducts' }),
            });

            const data = await res.json();
            console.log('Fetched products:', data);

            if (Array.isArray(data)) {
                setProducts(data);
            } else if (data.success === false) {
                setError(data.error || 'Failed to load products');
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('Error loading products:', err);
            setError('Unable to fetch products');
        } finally {
            setLoading(false);
        }
    }

    // =====================================================
    // HANDLE FORM CHANGE
    // =====================================================
    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }

    // =====================================================
    // CREATE or UPDATE PRODUCT
    // =====================================================
    async function handleSubmit(e) {
        e.preventDefault();
        const action = editingProduct ? 'updateProduct' : 'createProduct';
        const payload = { ...formData, action };

        if (editingProduct) payload.id = editingProduct.id;

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log('Save response:', data);

            if (data.success) {
                alert(editingProduct ? 'Product updated!' : 'Product created!');
                setShowModal(false);
                setEditingProduct(null);
                setFormData({
                    name: '',
                    description: '',
                    price: '',
                    image: '',
                    stripeLink: '',
                    paymentLink: '',
                    soldOut: false,
                    isNew: false,
                });
                loadProducts();
            } else {
                alert(data.error || 'Failed to save product');
            }
        } catch (err) {
            console.error('Error saving product:', err);
            alert('Unable to save product.');
        }
    }

    // =====================================================
    // DELETE PRODUCT
    // =====================================================
    async function handleDelete(id) {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteProduct', id }),
            });
            const data = await response.json();

            if (data.success) {
                alert('Product deleted!');
                loadProducts();
            } else {
                alert(data.error || 'Failed to delete product');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Unable to delete product.');
        }
    }

    // =====================================================
    // RENDER UI
    // =====================================================
    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
                padding: '2rem',
            }}
        >
            <h1
                style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                }}
            >
                Admin Dashboard
            </h1>

            {/* Add Product Button */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => {
                        setShowModal(true);
                        setEditingProduct(null);
                        setFormData({
                            name: '',
                            description: '',
                            price: '',
                            image: '',
                            stripeLink: '',
                            paymentLink: '',
                            soldOut: false,
                            isNew: false,
                        });
                    }}
                    style={{
                        background: '#f43f5e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    + Add Product
                </button>
            </div>

            {/* Products Table */}
            {loading ? (
                <p style={{ textAlign: 'center' }}>Loading products...</p>
            ) : error ? (
                <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>
            ) : products.length === 0 ? (
                <p style={{ textAlign: 'center' }}>No products yet. Add one!</p>
            ) : (
                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: 'white',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                    }}
                >
                    <thead>
                        <tr
                            style={{
                                background: '#f3f4f6',
                                textAlign: 'left',
                                fontWeight: '600',
                            }}
                        >
                            <th style={{ padding: '0.75rem' }}>Name</th>
                            <th style={{ padding: '0.75rem' }}>Price</th>
                            <th style={{ padding: '0.75rem' }}>Status</th>
                            <th style={{ padding: '0.75rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '0.75rem' }}>{p.name}</td>
                                <td style={{ padding: '0.75rem' }}>${p.price}</td>
                                <td style={{ padding: '0.75rem' }}>
                                    {p.soldOut ? 'Sold Out' : 'Available'}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <button
                                        onClick={() => {
                                            setEditingProduct(p);
                                            setFormData(p);
                                            setShowModal(true);
                                        }}
                                        style={{
                                            marginRight: '0.5rem',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '0.25rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        style={{
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '0.25rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Modal for Add/Edit Product */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '0.5rem',
                            width: '90%',
                            maxWidth: '500px',
                        }}
                    >
                        <h2 style={{ marginBottom: '1rem' }}>
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Name"
                                required
                                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }}
                            />
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Description"
                                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }}
                            />
                            <input
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="Price"
                                required
                                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }}
                            />
                            <input
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                placeholder="Image URL"
                                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }}
                            />
                            <input
                                name="stripeLink"
                                value={formData.stripeLink}
                                onChange={handleChange}
                                placeholder="Stripe Link"
                                style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }}
                            />
                            <label>
                                <input
                                    type="checkbox"
                                    name="soldOut"
                                    checked={formData.soldOut}
                                    onChange={handleChange}
                                />{' '}
                                Sold Out
                            </label>
                            <br />
                            <label>
                                <input
                                    type="checkbox"
                                    name="isNew"
                                    checked={formData.isNew}
                                    onChange={handleChange}
                                />{' '}
                                New Product
                            </label>
                            <div style={{ marginTop: '1rem' }}>
                                <button
                                    type="submit"
                                    style={{
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.25rem',
                                        marginRight: '0.5rem',
                                    }}
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        background: '#9ca3af',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.25rem',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;
