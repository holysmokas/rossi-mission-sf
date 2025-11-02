import React from 'react';
import { Link } from 'react-router-dom';

function About() {
    const artists = [
        {
            name: 'MQ',
            description: 'A legendary figure who began his journey in the late 1970s in New York City, painting alongside icons like Keith Haring.',
            category: 'Legend'
        },
        {
            name: 'JENKS',
            description: 'One of the most famous names in the history of graffiti art.',
            category: 'Legend'
        },
        {
            name: 'Savvy',
            description: 'A celebrated artist representing the golden era of street art.',
            category: 'Legend'
        },
        {
            name: 'Eclair Bandersnatch',
            description: 'Hailed by the media as "the new Banksy," representing the cutting edge of modern graffiti art.',
            category: 'Emerging'
        },
        {
            name: 'Savie',
            description: 'Part of the new wave of street artists pushing boundaries.',
            category: 'Emerging'
        },
        {
            name: 'GONER',
            description: 'An emerging talent in the contemporary street art scene.',
            category: 'Emerging'
        }
    ];

    const products = [
        { category: 'Fashion', items: ['T-shirts', 'Hoodies', 'Sweats', 'Printed designs', 'Hand-painted pieces'] },
        { category: 'Art Objects', items: ['Spray cans (starting at $100)', 'Figurines', 'Vases', 'Fire hydrants', 'Custom pieces'] }
    ];

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
                        <Link href="/" style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            background: 'linear-gradient(to right, #f43f5e, #ec4899)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            textDecoration: 'none'
                        }}>
                            Rossi Mission SF
                        </Link>
                    </div>
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <a href="/" style={{
                            color: '#374151',
                            fontWeight: '500',
                            textDecoration: 'none'
                        }}>Shop</a>
                        <Link href="/about" style={{
                            color: '#f43f5e',
                            fontWeight: '600',
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
                        }}><Link to="/login">
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
            <section style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '4rem 1rem',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: '3.75rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                    }}>
                        About Rossi Mission SF
                    </h1>
                    <p style={{
                        fontSize: '1.5rem',
                        maxWidth: '48rem',
                        margin: '0 auto',
                        opacity: 0.95
                    }}>
                        One of the premier graffiti art galleries in North America, showcasing a diverse array of Bay Area street artists
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1rem' }}>

                {/* Celebrated Artists Section */}
                <section style={{ marginBottom: '5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            color: '#111827',
                            marginBottom: '1rem'
                        }}>
                            Celebrated Artists
                        </h2>
                        <p style={{
                            fontSize: '1.125rem',
                            color: '#6b7280',
                            maxWidth: '42rem',
                            margin: '0 auto'
                        }}>
                            We represent legendary figures and emerging talents in the graffiti art world
                        </p>
                    </div>

                    {/* Legends */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{
                            fontSize: '1.875rem',
                            fontWeight: 'bold',
                            color: '#f43f5e',
                            marginBottom: '2rem',
                            textAlign: 'center'
                        }}>
                            Legendary Artists
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '2rem'
                        }}>
                            {artists.filter(a => a.category === 'Legend').map((artist, index) => (
                                <div key={index} style={{
                                    background: 'white',
                                    padding: '2rem',
                                    borderRadius: '1rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    borderLeft: '4px solid #f43f5e'
                                }}>
                                    <h4 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: '#111827',
                                        marginBottom: '0.75rem'
                                    }}>
                                        {artist.name}
                                    </h4>
                                    <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                                        {artist.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Emerging Artists */}
                    <div>
                        <h3 style={{
                            fontSize: '1.875rem',
                            fontWeight: 'bold',
                            color: '#8b5cf6',
                            marginBottom: '2rem',
                            textAlign: 'center'
                        }}>
                            The New Wave
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '2rem'
                        }}>
                            {artists.filter(a => a.category === 'Emerging').map((artist, index) => (
                                <div key={index} style={{
                                    background: 'white',
                                    padding: '2rem',
                                    borderRadius: '1rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    borderLeft: '4px solid #8b5cf6'
                                }}>
                                    <h4 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: '#111827',
                                        marginBottom: '0.75rem'
                                    }}>
                                        {artist.name}
                                    </h4>
                                    <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                                        {artist.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Art Meets Fashion Section */}
                <section style={{
                    background: 'white',
                    padding: '3rem',
                    borderRadius: '1.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    marginBottom: '5rem'
                }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: '#111827',
                        marginBottom: '1rem',
                        textAlign: 'center'
                    }}>
                        Art Meets Fashion
                    </h2>
                    <p style={{
                        fontSize: '1.125rem',
                        color: '#6b7280',
                        textAlign: 'center',
                        marginBottom: '3rem',
                        maxWidth: '42rem',
                        margin: '0 auto 3rem'
                    }}>
                        The gallery collaborates with artists to create exclusive clothing lines and unique art objects
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '2rem'
                    }}>
                        {products.map((product, index) => (
                            <div key={index} style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                padding: '2rem',
                                borderRadius: '1rem',
                                color: 'white'
                            }}>
                                <h3 style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    marginBottom: '1.5rem'
                                }}>
                                    {product.category}
                                </h3>
                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0
                                }}>
                                    {product.items.map((item, idx) => (
                                        <li key={idx} style={{
                                            padding: '0.75rem 0',
                                            borderBottom: idx < product.items.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <span style={{
                                                display: 'inline-block',
                                                width: '6px',
                                                height: '6px',
                                                background: 'white',
                                                borderRadius: '50%'
                                            }}></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Visit Us Section */}
                <section style={{
                    background: 'linear-gradient(to right, #f43f5e, #ec4899)',
                    color: 'white',
                    padding: '4rem 3rem',
                    borderRadius: '1.5rem',
                    textAlign: 'center',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem'
                    }}>
                        Visit Us
                    </h2>
                    <p style={{
                        fontSize: '1.25rem',
                        marginBottom: '0.5rem',
                        opacity: 0.95
                    }}>
                        791 Valencia Street, San Francisco, CA
                    </p>
                    <p style={{
                        fontSize: '1.125rem',
                        maxWidth: '42rem',
                        margin: '2rem auto 0',
                        opacity: 0.9
                    }}>
                        Rossi Mission SF is more than a gallery—it's a wonderland where graffiti art and fashion collide in an immersive experience.
                    </p>
                    <a
                        href="https://maps.google.com/?q=791+Valencia+Street+San+Francisco"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            marginTop: '2rem',
                            padding: '1rem 2rem',
                            background: 'white',
                            color: '#f43f5e',
                            fontWeight: 'bold',
                            borderRadius: '0.5rem',
                            textDecoration: 'none',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        Get Directions
                    </a>
                </section>
            </main>

            {/* Footer */}
            <footer style={{
                background: '#111827',
                color: 'white',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <p style={{ color: '#9ca3af' }}>© 2025 Rossi Mission SF. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default About;