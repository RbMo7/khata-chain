'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PendingCreditRequests } from '@/components/PendingCreditRequests'
import { ReputationCard } from '@/components/ReputationCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User,
  Mail,
  Phone,
  Wallet,
  Shield,
  TrendingUp,
  CheckCircle,
  Edit,
  Save,
  X,
  AlertCircle
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { borrowerApi } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'

export default function BorrowerProfile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch real profile data
  const { data: profileData } = useApi(() => borrowerApi.getProfile(), [])
  const { data: statsData } = useApi(() => borrowerApi.getStats(), [])

  const profile = profileData?.data || {}
  const stats = statsData?.data || {}

  const [editForm, setEditForm] = useState({ fullName: '', phone: '' })

  const handleEdit = () => {
    setEditForm({ fullName: profile.full_name || user?.name || '', phone: profile.phone_number || '' })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await borrowerApi.updateProfile({ fullName: editForm.fullName, phoneNumber: editForm.phone })
    } catch (err) { console.error(err) } finally {
      setIsEditing(false)
      setIsSaving(false)
    }
  }

  const handleCancel = () => setIsEditing(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Pending Credit Requests - Display First */}
        <PendingCreditRequests />

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account information</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Stats Cards */}
          <div className="md:col-span-3 grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalCredits ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.completedPayments ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">Payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeCredits ?? '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Member Since</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">{formatDate(profile.created_at)}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Profile Content */}
        <Tabs defaultValue="reputation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reputation"><TrendingUp className="h-3 w-3 mr-1" />Reputation</TabsTrigger>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* ── Reputation tab ── */}
          <TabsContent value="reputation">
            <ReputationCard />
          </TabsContent>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Your basic profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="fullName"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.full_name || user?.name || '—'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email || '—'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.phone_number || '—'}</span>
                    </div>
                  )}
                </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                        {isSaving ? <>Saving...</> : (<><Save className="mr-2 h-4 w-4" />Save Changes</>)}
                      </Button>
                      <Button onClick={handleCancel} variant="outline" className="flex-1">
                        <X className="mr-2 h-4 w-4" />Cancel
                      </Button>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Information</CardTitle>
                <CardDescription>
                  Your connected Solana wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/50">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm truncate">{profile.wallet_address || user?.walletAddress || '—'}</span>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your wallet address cannot be changed once set. It's permanently linked to your account.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Citizenship Verification</CardTitle>
                <CardDescription>
                  Verify your identity for enhanced trust
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      (profile.citizenship_verified_at || user?.citizenshipVerified) ? 'bg-chart-2/10' : 'bg-muted'
                    }`}>
                      <Shield className={`h-5 w-5 ${
                        (profile.citizenship_verified_at || user?.citizenshipVerified) ? 'text-chart-2' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">Citizenship Status</p>
                      <p className="text-sm text-muted-foreground">
                        {(profile.citizenship_verified_at || user?.citizenshipVerified) ? 'Verified' : 'Not Verified'}
                      </p>
                    </div>
                  </div>
                  {(profile.citizenship_verified_at || user?.citizenshipVerified) ? (
                    <CheckCircle className="h-5 w-5 text-chart-2" />
                  ) : (
                    <Button variant="outline">Verify Now</Button>
                  )}
                </div>

                {(profile.citizenship_verified_at || user?.citizenshipVerified) && (
                  <Alert className="bg-chart-2/5 border-chart-2/20">
                    <CheckCircle className="h-4 w-4 text-chart-2" />
                    <AlertDescription className="text-chart-2">
                      Your citizenship has been verified. This helps build trust and may qualify you for better credit terms.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
