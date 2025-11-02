import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Admin() {
    const [products, setProducts] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image: '',
        imageFile: null,
        stripeLink: '',
        paymentLink: '',
        soldOut: false,
        isNew: false
    });

    const proxyUrl = 'https://corsproxy.io/?';
    const APPS_SCRIPT_URL = proxyUrl + 'https://script.google.com/macros/s/AKfycbxCYF_V6khy6CqF69v14kS0dzZpjVaoC_e76Eh4m4zIs1n2OE5HWY99cy0_PzQqnaMk5w/exec';



    // Load products on mount
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await fetch(APPS_SCRIPT_URL);
            const data = await res.json();
            setProducts(data);
        } catch (err) {
            console.error('Failed to load products', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, imageFile: file }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const productData = {
                action: isEditing ? 'updateProduct' : 'createProduct',
                id: currentProduct?.id,
                name: formData.name,
                description: formData.description,
                price: formData.price,
                image: formData.image || imagePreview,
                stripeLink: formData.stripeLink,
                paymentLink: formData.paymentLink,
                soldOut: formData.soldOut,
                isNew: formData.isNew
            };

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                alert(isEditing ? 'Product updated!' : 'Product created!');
                resetForm();
                loadProducts();
                setShowModal(false);
            }
        } catch (err) {
            console.error('Failed to save product', err);
            alert('Failed to save product');
        }
    };

    const handleEdit = (product) => {
        setCurrentProduct(product);
        setIsEditing(true);
        setFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image,
            imageFile: null,
            stripeLink: product.stripeLink || '',
            paymentLink: product.paymentLink || '',
            soldOut: product.soldOut || false,
            isNew: product.isNew || false
        });
        setImagePreview(product.image);
        setShowModal(true);
    };

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteProduct', id: productId })
            });

            if (response.ok) {
                alert('Product deleted!');
                loadProducts();
            }
        } catch (err) {
            console.error('Failed to delete product', err);
            alert('Failed to delete product');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            image: '',
            imageFile: null,
            stripeLink: '',
            paymentLink: '',
            soldOut: false,
            isNew: false
        });
        setImagePreview(null);
        setIsEditing(false);
        setCurrentProduct(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '0 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '4rem'
                }}>
                    <div>
                        <Link to="/" style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            background: 'linear-gradient(to right, #f43f5e, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textDecoration: 'none'
                        }}>
                            Rossi Mission SF
                        </Link>
                        <span style={{ marginLeft: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>Admin Dashboard</span>
                    </div>
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <Link to="/" style={{ color: '#374151', fontWeight: '500', textDecoration: 'none' }}>
                            Shop
                        </Link>
                        <button style={{
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}>
                            Logout
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
                {/* Stats & Actions */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Products</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{products.length}</p>
                    </div>

                    <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>In Stock</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                            {products.filter(p => !p.soldOut).length}
                        </p>
                    </div>

                    <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Sold Out</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                            {products.filter(p => p.soldOut).length}
                        </p>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                        onClick={openAddModal}>
                        <span style={{ fontSize: '2rem', color: 'white', marginRight: '0.5rem' }}>+</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>Add Product</span>
                    </div>
                </div>

                {/* Products Table */}
                <div style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Products</h2>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Image</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Price</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Payment Link</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <img
                                                src={product.image || 'https://via.placeholder.com/60'}
                                                alt={product.name}
                                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.5rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600', color: '#111827' }}>{product.name}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                                {product.description?.substring(0, 50)}...
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: '#111827', fontWeight: '600' }}>
                                            ${product.price}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: product.soldOut ? '#fee2e2' : '#d1fae5',
                                                color: product.soldOut ? '#991b1b' : '#065f46'
                                            }}>
                                                {product.soldOut ? 'Sold Out' : 'In Stock'}
                                            </span>
                                            {product.isNew && (
                                                <span style={{
                                                    marginLeft: '0.5rem',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    background: '#dbeafe',
                                                    color: '#1e40af'
                                                }}>
                                                    NEW
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                            {product.stripeLink || product.paymentLink ? (
                                                <a href={product.stripeLink || product.paymentLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                    View Link
                                                </a>
                                            ) : (
                                                <span style={{ color: '#9ca3af' }}>No link</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleEdit(product)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    marginRight: '0.5rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1rem'
                }}
                    onClick={() => setShowModal(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '1rem',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}
                        onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                                {isEditing ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    fontSize: '1.5rem',
                                    color: '#6b7280',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Description *
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    required
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Price *
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Product Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                {imagePreview && (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        style={{
                                            marginTop: '1rem',
                                            width: '100%',
                                            maxHeight: '200px',
                                            objectFit: 'contain',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                )}
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                    Or enter image URL below
                                </p>
                                <input
                                    type="url"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/image.jpg"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        marginTop: '0.5rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Stripe Payment Link
                                </label>
                                <input
                                    type="url"
                                    name="stripeLink"
                                    value={formData.stripeLink}
                                    onChange={handleInputChange}
                                    placeholder="https://buy.stripe.com/..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                                    Alternative Payment Link (PayPal, Square, etc.)
                                </label>
                                <input
                                    type="url"
                                    name="paymentLink"
                                    value={formData.paymentLink}
                                    onChange={handleInputChange}
                                    placeholder="https://paypal.me/..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="soldOut"
                                        checked={formData.soldOut}
                                        onChange={handleInputChange}
                                        style={{
                                            width: '1.25rem',
                                            height: '1.25rem',
                                            marginRight: '0.5rem',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                        Mark as Sold Out
                                    </span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="isNew"
                                        checked={formData.isNew}
                                        onChange={handleInputChange}
                                        style={{
                                            width: '1.25rem',
                                            height: '1.25rem',
                                            marginRight: '0.5rem',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                        Mark as New
                                    </span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: '#f3f4f6',
                                        color: '#374151',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: 'linear-gradient(to right, #f43f5e, #ec4899)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isEditing ? 'Update Product' : 'Add Product'}
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