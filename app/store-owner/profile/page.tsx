'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Store,
  Mail,
  Phone,
  Wallet,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function StoreOwnerProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Mock data - replace with real API calls
  const [profile, setProfile] = useState({
    storeName: 'Sharma Kirana Store',
    email: 'sharma.store@example.com',
    phone: '+91 98765 43210',
    walletAddress: 'Dy7MkRPhTBx9XYz8N5K2uL6vM9pW3sT4cF1hD2gR8vJ',
    storeAddress: '123 Main Street, Block A',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    businessType: 'Retail - General Store',
    totalBorrowers: 24,
    totalCreditsIssued: 180,
    memberSince: '2024-03-20'
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

  return (
    <DashboardLayout userType="store-owner">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Store Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your store information</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Borrowers
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile.totalBorrowers}</div>
              <p className="text-xs text-muted-foreground mt-1">Active customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Credits Issued
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile.totalCreditsIssued}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Member Since
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatDate(profile.memberSince)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Profile Content */}
        <Tabs defaultValue="store" className="space-y-4">
          <TabsList>
            <TabsTrigger value="store">Store Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>
                  Basic details about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  {isEditing ? (
                    <Input
                      id="storeName"
                      value={editForm.storeName}
                      onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border border-border rounded-md">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.storeName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  {isEditing ? (
                    <Input
                      id="businessType"
                      value={editForm.businessType}
                      onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                    />
                  ) : (
                    <div className="p-2 border border-border rounded-md">
                      <span>{profile.businessType}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Store Address</Label>
                  {isEditing ? (
                    <Textarea
                      id="storeAddress"
                      value={editForm.storeAddress}
                      onChange={(e) => setEditForm({ ...editForm, storeAddress: e.target.value })}
                      rows={2}
                    />
                  ) : (
                    <div className="flex items-start gap-2 p-2 border border-border rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <span>{profile.storeAddress}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    {isEditing ? (
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      />
                    ) : (
                      <div className="p-2 border border-border rounded-md">
                        <span>{profile.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    {isEditing ? (
                      <Input
                        id="state"
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      />
                    ) : (
                      <div className="p-2 border border-border rounded-md">
                        <span>{profile.state}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    {isEditing ? (
                      <Input
                        id="postalCode"
                        value={editForm.postalCode}
                        onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                      />
                    ) : (
                      <div className="p-2 border border-border rounded-md">
                        <span>{profile.postalCode}</span>
                      </div>
                    )}
                  </div>
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

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  How customers can reach you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    Your wallet address cannot be changed once set. It's permanently linked to your store account.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solana Wallet</CardTitle>
                <CardDescription>
                  Your wallet receives SOL repayments from borrowers directly on-chain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Wallet Address</p>
                      <p className="text-sm text-muted-foreground font-mono truncate max-w-[220px]">
                        {profile.walletAddress}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                </div>

                <Alert className="bg-chart-2/5 border-chart-2/20">
                  <CheckCircle className="h-4 w-4 text-chart-2" />
                  <AlertDescription className="text-chart-2">
                    Borrowers send SOL directly to this wallet when repaying credits on-chain.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
