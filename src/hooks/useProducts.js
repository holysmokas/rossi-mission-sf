import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function useProducts(options = {}) {
  const { category, featured, limit } = options
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [category, featured, limit])

  async function fetchProducts() {
    try {
      setLoading(true)
      let query = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      if (featured) {
        query = query.eq('featured', true)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { products, loading, error, refetch: fetchProducts }
}
