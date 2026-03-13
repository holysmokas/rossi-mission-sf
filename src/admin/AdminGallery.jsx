import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

function compressImage(file, maxWidth = 1400, quality = 0.82) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file)
            return
        }

        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.onload = () => {
            let { width, height } = img
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width)
                width = maxWidth
            }
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
                (blob) => {
                    const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    })
                    console.log(`Compressed: ${file.name} — ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`)
                    resolve(compressed)
                },
                'image/jpeg',
                quality
            )
        }

        img.onerror = () => resolve(file)
        img.src = URL.createObjectURL(file)
    })
}

function GalleryCard({ img, index, total, onMove, onToggle, onDelete, onUpdate }) {
    const [editing, setEditing] = useState(false)
    const [title, setTitle] = useState(img.title || '')
    const [artist, setArtist] = useState(img.artist || '')

    async function saveDetails() {
        await supabase
            .from('gallery_images')
            .update({ title: title.trim() || null, artist: artist.trim() || null })
            .eq('id', img.id)
        setEditing(false)
        onUpdate()
    }

    return (
        <div className={`gallery-admin-card${!img.active ? ' inactive' : ''}`}>
            <div className="gallery-admin-img">
                <img src={img.image_url} alt={img.title || img.file_name || 'Gallery'} />
                <div className="showcase-card-order">#{index + 1}</div>
                {img.featured && <div className="gallery-admin-featured">★</div>}
            </div>

            {editing ? (
                <div className="gallery-admin-edit">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        className="gallery-admin-input"
                    />
                    <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Artist"
                        className="gallery-admin-input"
                    />
                    <div className="gallery-admin-edit-btns">
                        <button className="admin-btn small primary" onClick={saveDetails}>Save</button>
                        <button className="admin-btn small" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="gallery-admin-meta" onClick={() => setEditing(true)} title="Click to edit">
                    <span className="gallery-admin-title">{img.title || 'Untitled'}</span>
                    {img.artist && <span className="gallery-admin-artist">by {img.artist}</span>}
                </div>
            )}

            <div className="showcase-card-actions">
                <div className="showcase-card-arrows">
                    <button className="admin-btn small" onClick={() => onMove(index, -1)} disabled={index === 0}>↑</button>
                    <button className="admin-btn small" onClick={() => onMove(index, 1)} disabled={index === total - 1}>↓</button>
                </div>

                <button className={`toggle-btn ${img.active ? 'on' : 'off'}`} onClick={() => onToggle(img)}>
                    {img.active ? 'Active' : 'Hidden'}
                </button>

                <button className="admin-btn small danger" onClick={() => onDelete(img)}>Delete</button>
            </div>
        </div>
    )
}

export default function AdminGallery() {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const fileRef = useRef(null)
    const dragItem = useRef(null)
    const dragOver = useRef(null)

    useEffect(() => { fetchImages() }, [])

    async function fetchImages() {
        setLoading(true)
        const { data, error } = await supabase
            .from('gallery_images')
            .select('*')
            .order('sort_order', { ascending: true })
        if (!error) setImages(data || [])
        setLoading(false)
    }

    async function handleUpload(e) {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        const imageFiles = files.filter((f) => f.type.startsWith('image/'))
        if (imageFiles.length === 0) { alert('Please select image files only.'); return }

        setUploading(true)
        const maxOrder = images.length > 0 ? Math.max(...images.map((i) => i.sort_order)) : -1
        let uploaded = 0
        let failed = 0

        for (const file of imageFiles) {
            setUploadProgress(`Compressing & uploading ${uploaded + 1} of ${imageFiles.length}...`)

            const compressed = await compressImage(file, 1400, 0.82)
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(fileName, compressed, { cacheControl: '3600', contentType: 'image/jpeg' })

            if (uploadError) { console.error('Upload failed:', file.name, uploadError); failed++; continue }

            const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(fileName)

            const { error: dbError } = await supabase.from('gallery_images').insert({
                image_url: publicUrl,
                storage_path: fileName,
                file_name: file.name,
                sort_order: maxOrder + uploaded + 1,
                active: true,
            })

            if (dbError) { console.error('DB insert failed:', file.name, dbError); failed++; continue }
            uploaded++
        }

        setUploadProgress('')
        setUploading(false)
        fileRef.current.value = ''
        if (failed > 0) alert(`Uploaded ${uploaded}. ${failed} failed — check console.`)
        fetchImages()
    }

    async function toggleActive(image) {
        await supabase.from('gallery_images').update({ active: !image.active }).eq('id', image.id)
        fetchImages()
    }

    async function deleteImage(image) {
        if (!window.confirm('Delete this gallery image?')) return
        await supabase.storage.from('gallery').remove([image.storage_path])
        await supabase.from('gallery_images').delete().eq('id', image.id)
        fetchImages()
    }

    function handleDragStart(index) { dragItem.current = index }
    function handleDragEnter(index) { dragOver.current = index }

    async function handleDragEnd() {
        if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return
        const reordered = [...images]
        const [removed] = reordered.splice(dragItem.current, 1)
        reordered.splice(dragOver.current, 0, removed)
        setImages(reordered)
        for (let i = 0; i < reordered.length; i++) {
            if (reordered[i].sort_order !== i) {
                await supabase.from('gallery_images').update({ sort_order: i }).eq('id', reordered[i].id)
            }
        }
        dragItem.current = null
        dragOver.current = null
    }

    async function moveImage(index, direction) {
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= images.length) return
        const reordered = [...images]
        const [removed] = reordered.splice(index, 1)
        reordered.splice(newIndex, 0, removed)
        setImages(reordered)
        await supabase.from('gallery_images').update({ sort_order: newIndex }).eq('id', removed.id)
        await supabase.from('gallery_images').update({ sort_order: index }).eq('id', reordered[index].id)
    }

    const activeCount = images.filter((i) => i.active).length

    return (
        <>
            <div className="admin-toolbar">
                <div>
                    <p className="inventory-log-hint">
                        {activeCount} active image{activeCount !== 1 ? 's' : ''} displayed on the Gallery page. Click an image title to edit details.
                    </p>
                </div>
                <div className="admin-toolbar-actions">
                    <button className="admin-btn primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? uploadProgress : '+ Upload Art'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
                </div>
            </div>

            {loading ? (
                <div className="admin-loading"><p>Loading gallery...</p></div>
            ) : images.length === 0 ? (
                <div className="showcase-empty">
                    <div className="showcase-empty-icon">🎨</div>
                    <p>No gallery images yet.</p>
                    <p className="showcase-empty-hint">Upload art to display on the Gallery page.</p>
                    <button className="admin-btn primary" onClick={() => fileRef.current?.click()} style={{ marginTop: 16 }}>
                        Upload Art
                    </button>
                </div>
            ) : (
                <div className="showcase-grid">
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <GalleryCard
                                img={img}
                                index={index}
                                total={images.length}
                                onMove={moveImage}
                                onToggle={toggleActive}
                                onDelete={deleteImage}
                                onUpdate={fetchImages}
                            />
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}