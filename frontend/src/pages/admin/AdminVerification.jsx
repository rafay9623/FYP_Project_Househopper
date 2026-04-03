import { useEffect, useState } from 'react'
import { propertyAuthApi } from '@/services/api.service'
import { Loader2, CheckCircle, XCircle, Clock, ShieldCheck, Building2, Mail, Calendar, FileText, AlertCircle, Info, Check, ShieldAlert, Image, ExternalLink, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

const STATUS_FILTERS = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Verified', value: 'verified' },
    { label: 'Rejected', value: 'rejected' },
]

export default function AdminVerification() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')
    const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 })
    const [actionLoading, setActionLoading] = useState({})
    const [noteInputs, setNoteInputs] = useState({})
    const [showNote, setShowNote] = useState({})

    useEffect(() => {
        fetchRequests()
    }, [filter])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            const data = await propertyAuthApi.getAllRequests(filter || undefined)
            setRequests(data.requests || [])
            if (data.counts) setCounts(data.counts)
        } catch (err) {
            console.error('Failed to fetch auth requests:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleReview = async (requestId, action) => {
        setActionLoading(prev => ({ ...prev, [requestId]: action }))
        try {
            const note = noteInputs[requestId] || ''
            await propertyAuthApi.reviewRequest(requestId, action, note)

            // Update local state
            setRequests(prev =>
                prev.map(r =>
                    r.id === requestId
                        ? {
                            ...r,
                            status: action === 'approve' ? 'verified' : 'rejected',
                            reviewedAt: new Date().toISOString(),
                            adminNote: note || null,
                        }
                        : r
                )
            )

            // Update counts
            setCounts(prev => ({
                ...prev,
                pending: Math.max(0, prev.pending - 1),
                [action === 'approve' ? 'verified' : 'rejected']:
                    prev[action === 'approve' ? 'verified' : 'rejected'] + 1,
            }))

            // Clear note input
            setNoteInputs(prev => ({ ...prev, [requestId]: '' }))
            setShowNote(prev => ({ ...prev, [requestId]: false }))
        } catch (error) {
            console.error('Failed to review request:', error)
            alert(error.message || 'Failed to process review')
        } finally {
            setActionLoading(prev => ({ ...prev, [requestId]: null }))
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1 text-xs">
                        <Clock className="h-3 w-3" /> Pending
                    </Badge>
                )
            case 'verified':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" /> Verified
                    </Badge>
                )
            case 'rejected':
                return (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1 text-xs">
                        <XCircle className="h-3 w-3" /> Rejected
                    </Badge>
                )
            default:
                return null
        }
    }

    const getMatchBadge = (verificationStatus, matchType) => {
        if (verificationStatus === 'Match Found') {
            return (
                <Badge className="bg-emerald-500 text-white border-none gap-1 py-1 px-3">
                    <Check className="h-3.5 w-3.5" /> Match Found {matchType === 'exact' ? '(Exact)' : '(Partial)'}
                </Badge>
            )
        }
        if (verificationStatus === 'No Match Found') {
            return (
                <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-50 gap-1 py-1 px-3">
                    <AlertCircle className="h-3.5 w-3.5" /> No Match Found
                </Badge>
            )
        }
        return null
    }

    const formatDate = (iso) => {
        if (!iso) return '—'
        return new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 py-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-background border p-4 rounded-xl">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        Property Verification
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Review and process property authentication requests.
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="text-center px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="text-lg font-bold text-yellow-600">{counts.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-bold text-emerald-600">{counts.verified}</div>
                        <div className="text-xs text-muted-foreground">Verified</div>
                    </div>
                    <div className="text-center px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="text-lg font-bold text-red-600">{counts.rejected}</div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {STATUS_FILTERS.map(f => (
                    <Button
                        key={f.value}
                        variant={filter === f.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(f.value)}
                    >
                        {f.label}
                        {f.value === 'pending' && counts.pending > 0 && (
                            <span className="ml-1.5 bg-yellow-500/20 text-yellow-700 rounded-full px-1.5 py-0.5 text-xs font-semibold">
                                {counts.pending}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Requests List */}
            {requests.length === 0 ? (
                <div className="py-16 text-center border rounded-xl bg-card text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No requests found</p>
                    <p className="text-sm mt-1">
                        {filter
                            ? `No ${filter} requests at this time.`
                            : 'No authentication requests have been submitted yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(request => (
                        <div
                            key={request.id}
                            className={`
                                border rounded-xl bg-card p-5 shadow-sm transition-all
                                ${request.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/[0.02]' : ''}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-3 flex-1">
                                    {/* Property Info */}
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">{request.propertyName}</h3>
                                        {getStatusBadge(request.status)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {request.propertyAddress || 'No address'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5" />
                                            {request.userEmail}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Submitted: {formatDate(request.submittedAt)}
                                        </div>
                                    </div>

                                    {request.reviewedAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Reviewed: {formatDate(request.reviewedAt)}
                                        </p>
                                    )}

                                    {request.adminNote && (
                                        <div className="text-sm bg-muted/50 px-3 py-2 rounded-md flex items-start gap-2">
                                            <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span>{request.adminNote}</span>
                                        </div>
                                    )}

                                    {/* Matching Results Section */}
                                    <div className="mt-4 pt-4 border-t space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-primary" />
                                                <span className="font-medium">Automatic Database Matching</span>
                                            </div>
                                            {getMatchBadge(request.verificationStatus, request.matchType)}
                                        </div>

                                        {request.verificationStatus === 'Match Found' ? (
                                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 space-y-3">
                                                <div className="flex items-start gap-2 text-emerald-800 text-sm font-medium">
                                                    <CheckCircle className="h-4 w-4 mt-0.5" />
                                                    <p>This property exists in database. You can verify it.</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                    <div className="space-y-1">
                                                        <p className="text-muted-foreground uppercase font-semibold">Submitted Details</p>
                                                        <p><span className="font-medium">Address:</span> {request.propertyAddress}</p>
                                                        <p><span className="font-medium">Type:</span> {request.matchType === 'exact' ? 'Matched' : 'Check required'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-emerald-700 uppercase font-semibold">Registry Match ({request.matchedPropertyId})</p>
                                                        <p><span className="font-medium">Official Address:</span> {request.matchedRegistryData?.propertyAddress}</p>
                                                        <p><span className="font-medium">Reg Num:</span> {request.matchedRegistryData?.registrationNumber}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-start gap-2 text-orange-800 text-sm">
                                                <AlertCircle className="h-4 w-4 mt-0.5" />
                                                <p>No matching property found. Manual verification required.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Submitted Documents Section */}
                                    {(request.idCardUrl || request.propertyDocUrl) && (
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Image className="h-4 w-4 text-primary" />
                                                <span className="font-medium">Submitted Documents</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* ID Card */}
                                                {request.idCardUrl && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <CreditCard className="h-3 w-3" /> ID Card / CNIC
                                                        </p>
                                                        <a href={request.idCardUrl} target="_blank" rel="noopener noreferrer" className="block group">
                                                            <div className="relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors">
                                                                <img
                                                                    src={request.idCardUrl}
                                                                    alt="ID Card"
                                                                    className="w-full h-40 object-cover"
                                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                                                                />
                                                                <div className="w-full h-40 items-center justify-center bg-muted/30 hidden">
                                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                                </div>
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                    <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}
                                                {/* Property Document */}
                                                {request.propertyDocUrl && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <FileText className="h-3 w-3" /> Property Document
                                                        </p>
                                                        <a href={request.propertyDocUrl} target="_blank" rel="noopener noreferrer" className="block group">
                                                            <div className="relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors">
                                                                {request.propertyDocUrl.endsWith('.pdf') ? (
                                                                    <div className="w-full h-40 flex items-center justify-center bg-muted/30 gap-3">
                                                                        <FileText className="h-10 w-10 text-primary" />
                                                                        <div>
                                                                            <p className="text-sm font-medium">PDF Document</p>
                                                                            <p className="text-xs text-muted-foreground">Click to view</p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <img
                                                                            src={request.propertyDocUrl}
                                                                            alt="Property Document"
                                                                            className="w-full h-40 object-cover"
                                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                                                                        />
                                                                        <div className="w-full h-40 items-center justify-center bg-muted/30 hidden">
                                                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                                                        </div>
                                                                    </>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                    <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {request.status === 'pending' && (
                                    <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                            onClick={() => handleReview(request.id, 'approve')}
                                            disabled={!!actionLoading[request.id]}
                                        >
                                            {actionLoading[request.id] === 'approve' ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4" />
                                            )}
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="gap-1.5"
                                            onClick={() => handleReview(request.id, 'reject')}
                                            disabled={!!actionLoading[request.id]}
                                        >
                                            {actionLoading[request.id] === 'reject' ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <XCircle className="h-4 w-4" />
                                            )}
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs text-muted-foreground"
                                            onClick={() => setShowNote(prev => ({ ...prev, [request.id]: !prev[request.id] }))}
                                        >
                                            {showNote[request.id] ? 'Hide Note' : 'Add Note'}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Admin Note Input */}
                            {showNote[request.id] && request.status === 'pending' && (
                                <div className="mt-3 pt-3 border-t">
                                    <Textarea
                                        placeholder="Optional note for this review decision..."
                                        value={noteInputs[request.id] || ''}
                                        onChange={(e) => setNoteInputs(prev => ({ ...prev, [request.id]: e.target.value }))}
                                        className="text-sm resize-none"
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
