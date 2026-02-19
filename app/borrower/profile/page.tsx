'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
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

export default function BorrowerProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Mock data - replace with real API calls
  const [profile, setProfile] = useState({
    fullName: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    phone: '+91 98765 43210',
    walletAddress: 'EqKx7jRPhTBx9XYz8N5K2uL6vM9pW3sT4cF1hD2gR8vJ',
    citizenshipVerified: true,
    reputationScore: 850,
    totalCredits: 15,
    completedPayments: 12,
    memberSince: '2025-06-15'
  })

  const [editForm, setEditForm] = useState({ ...profile })

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setProfile(editForm)
      setIsEditing(false)
      setIsSaving(false)
    }, 1000)
  }

  const handleCancel = () => {
    setEditForm({ ...profile })
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getReputationLevel = (score: number) => {
    if (score >= 850) return { label: 'Excellent', color: 'text-chart-2' }
    if (score >= 700) return { label: 'Good', color: 'text-chart-4' }
    if (score >= 550) return { label: 'Fair', color: 'text-chart-1' }
    return { label: 'Building', color: 'text-muted-foreground' }
  }

  const reputationLevel = getReputationLevel(profile.reputationScore)

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-4xl mx-auto space-y-6">
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
          {/* Reputation Score Card */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center mb-2">
                <TrendingUp className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reputation Score
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className={`text-4xl font-bold ${reputationLevel.color}`}>
                {profile.reputationScore}
              </div>
              <Badge variant="secondary">{reputationLevel.label}</Badge>
              <p className="text-xs text-muted-foreground pt-2">
                Based on {profile.totalCredits} credit entries
              </p>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="md:col-span-2 grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{profile.totalCredits}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{profile.completedPayments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((profile.completedPayments / profile.totalCredits) * 100).toFixed(0)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Member Since
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatDate(profile.memberSince)}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Profile Content */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

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
                      <span>{profile.fullName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.email}</span>
                    </div>
                  )}
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
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                      {isSaving ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" className="flex-1">
                      <X className="mr-2 h-4 w-4" />
                      Cancel
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
                    <span className="font-mono text-sm truncate">{profile.walletAddress}</span>
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
                      profile.citizenshipVerified ? 'bg-chart-2/10' : 'bg-muted'
                    }`}>
                      <Shield className={`h-5 w-5 ${
                        profile.citizenshipVerified ? 'text-chart-2' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">Citizenship Status</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.citizenshipVerified ? 'Verified' : 'Not Verified'}
                      </p>
                    </div>
                  </div>
                  {profile.citizenshipVerified ? (
                    <CheckCircle className="h-5 w-5 text-chart-2" />
                  ) : (
                    <Button variant="outline">Verify Now</Button>
                  )}
                </div>

                {profile.citizenshipVerified && (
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
