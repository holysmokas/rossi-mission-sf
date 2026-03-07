import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './ImageShowcase.css'

export default function ImageShowcase() {
    const [imageUrl, setImageUrl] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchShowcaseImage()
    }, [])

    async function fetchShowcaseImage() {
        const { data, error } = await supabase
            .from('showcase_images')
            .select('image_url')
            .eq('active', true)
            .order('sort_order', { ascending: true })

        if (error || !data || data.length === 0) {
            setLoading(false)
            return
        }

        // Calculate which image to show based on date
        // Changes every 3 days, cycles through all images
        const startDate = new Date('2026-01-01') // fixed reference date
        const now = new Date()
        const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
        const imageIndex = Math.floor(daysSinceStart / 3) % data.length

        setImageUrl(data[imageIndex].image_url)
        setLoading(false)
    }

    if (loading) return null
    if (!imageUrl) return null

    return (
        <section className="showcase-section">
            <div className="showcase-container">
                <div className="showcase-image-wrap">
                    <img
                        src={imageUrl}
                        alt="Rossi Mission SF"
                        className="showcase-image"
                    />
                </div>
            </div>
        </section>
    )
}