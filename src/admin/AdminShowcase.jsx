import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

export default function AdminShowcase() {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const fileRef = useRef(null)
    const dragItem = useRef(null)
    const dragOver = useRef(null)

    useEffect(() => {
        fetchImages()
    }, [])

    async function fetchImages() {
        setLoading(true)
        const { data, error } = await supabase
            .from('showcase_images')
            .select('*')
            .order('sort_order', { ascending: true })

        if (!error) {
            setImages(data || [])
        }
        setLoading(false)
    }

    async function handleUpload(e) {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        const imageFiles = files.filter(f => f.type.startsWith('image/'))
        if (imageFiles.length === 0) {
            alert('Please select image files only.')
            return
        }

        setUploading(true)
        const maxOrder = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) : -1
        let uploaded = 0

        for (const file of imageFiles) {
            setUploadProgress(`Uploading ${uploaded + 1} of ${imageFiles.length}...`)

            const ext = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
            const storagePath = `showcase/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('showcase')
                .upload(fileName, file, { cacheControl: '3600' })

            if (uploadError) {
                console.error('Upload failed:', file.name, uploadError)
                continue
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('showcase')
                .getPublicUrl(fileName)

            // Save to database
            await supabase.from('showcase_images').insert({
                image_url: publicUrl,
                storage_path: fileName,
                file_name: file.name,
                sort_order: maxOrder + uploaded + 1,
                active: true,
            })

            uploaded++
        }

        setUploadProgress('')
        setUploading(false)
        fileRef.current.value = ''
        fetchImages()
    }

    async function toggleActive(image) {
        await supabase
            .from('showcase_images')
            .update({ active: !image.active })
            .eq('id', image.id)
        fetchImages()
    }

    async function deleteImage(image) {
        if (!window.confirm(`Delete this image? This cannot be undone.`)) return

        // Remove from storage
        await supabase.storage.from('showcase').remove([image.storage_path])

        // Remove from database
        await supabase.from('showcase_images').delete().eq('id', image.id)

        fetchImages()
    }

    // Drag and drop reordering
    function handleDragStart(index) {
        dragItem.current = index
    }

    function handleDragEnter(index) {
        dragOver.current = index
    }

    async function handleDragEnd() {
        if (dragItem.current === null || dragOver.current === null) return
        if (dragItem.current === dragOver.current) return

        const reordered = [...images]
        const [removed] = reordered.splice(dragItem.current, 1)
        reordered.splice(dragOver.current, 0, removed)

        // Update local state immediately
        setImages(reordered)

        // Batch update sort_order in database
        for (let i = 0; i < reordered.length; i++) {
            if (reordered[i].sort_order !== i) {
                await supabase
                    .from('showcase_images')
                    .update({ sort_order: i })
                    .eq('id', reordered[i].id)
            }
        }

        dragItem.current = null
        dragOver.current = null
    }

    // Move up/down buttons (alternative to drag)
    async function moveImage(index, direction) {
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= images.length) return

        const reordered = [...images]
        const [removed] = reordered.splice(index, 1)
        reordered.splice(newIndex, 0, removed)

        setImages(reordered)

        // Update both swapped items
        await supabase.from('showcase_images').update({ sort_order: newIndex }).eq('id', removed.id)
        await supabase.from('showcase_images').update({ sort_order: index }).eq('id', reordered[index].id)
    }

    const activeCount = images.filter(i => i.active).length
    const cycleDays = activeCount * 3

    return (
        <>
            <div className="admin-toolbar">
                <div className="showcase-info">
                    <p className="inventory-log-hint">
                        {activeCount} active image{activeCount !== 1 ? 's' : ''} — rotates every 3 days — full cycle: {cycleDays} days
                    </p>
                </div>
                <div className="admin-toolbar-actions">
                    <button
                        className="admin-btn primary"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? uploadProgress : '+ Upload Images'}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUpload}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="admin-loading"><p>Loading showcase images...</p></div>
            ) : images.length === 0 ? (
                <div className="showcase-empty">
                    <div className="showcase-empty-icon">🖼</div>
                    <p>No showcase images yet.</p>
                    <p className="showcase-empty-hint">Upload images and they'll rotate on the homepage every 3 days.</p>
                    <button className="admin-btn primary" onClick={() => fileRef.current?.click()} style={{ marginTop: 16 }}>
                        Upload Images
                    </button>
                </div>
            ) : (
                <div className="showcase-grid">
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            className={`showcase-card${!img.active ? ' inactive' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <div className="showcase-card-img">
                                <img src={img.image_url} alt={img.file_name || 'Showcase'} />
                                <div className="showcase-card-order">#{index + 1}</div>
                            </div>

                            <div className="showcase-card-actions">
                                <div className="showcase-card-arrows">
                                    <button
                                        className="admin-btn small"
                                        onClick={() => moveImage(index, -1)}
                                        disabled={index === 0}
                                        title="Move up"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        className="admin-btn small"
                                        onClick={() => moveImage(index, 1)}
                                        disabled={index === images.length - 1}
                                        title="Move down"
                                    >
                                        ↓
                                    </button>
                                </div>

                                <button
                                    className={`toggle-btn ${img.active ? 'on' : 'off'}`}
                                    onClick={() => toggleActive(img)}
                                >
                                    {img.active ? 'Active' : 'Hidden'}
                                </button>

                                <button
                                    className="admin-btn small danger"
                                    onClick={() => deleteImage(img)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}