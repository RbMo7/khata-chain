'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, CheckCircle, Search, AlertCircle, Loader2, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { formatNPR } from '@/lib/currency-utils'
import { useApi, useMutation } from '@/hooks/use-api'
import { searchApi, creditApi } from '@/lib/api-client'
import { ReputationBadge } from '@/components/ReputationBadge'

export default function CreateCreditPage() {
  const router = useRouter()
  const [step, setStep] = useState<'search' | 'verify' | 'details' | 'confirm'>('search')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [creatingCredit, setCreatingCredit] = useState(false)
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [currency, setCurrency] = useState('NPR')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date>()
  const [interestRate, setInterestRate] = useState('')
  const [collateral, setCollateral] = useState('')

  // Fetch recent borrowers (we'll use a default query)
  const { data: recentBorrowersData } = useApi(
    () => searchApi.borrowers(''),
    []
  )

  const recentBorrowers = recentBorrowersData?.data?.results || []

  const handleSearchBorrower = async () => {
    setSearching(true)
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query')
      setSearching(false)
      return
    }
    
    try {
      const result = await searchApi.borrowers(searchQuery)
      
      if (result.data?.results && result.data.results.length > 0) {
        setSearchResults(result.data.results)
        if (result.data.results.length === 1) {
          setSelectedBorrower(result.data.results[0])
          setStep('verify')
        }
      } else {
        setError('Borrower not found. Please check the wallet address or email.')
      }
    } catch (err) {
      setError('Failed to search for borrower. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleCreateCredit = async () => {
    setError(null)
    setCreatingCredit(true)
    
    if (!selectedBorrower || !creditAmount || !description || !dueDate) {
      setError('Please fill in all required fields')
      setCreatingCredit(false)
      return
    }

    try {
      // Convert amount to paisa (smallest unit)
      const amountInPaisa = Math.round(parseFloat(creditAmount) * 100)
      
      const creditData = {
        borrowerPubkey: selectedBorrower.borrower_pubkey,
        creditAmount: amountInPaisa,
        currency: currency,
        description: description,
        dueDate: dueDate.toISOString()
      }
      
      await creditApi.create(creditData)
      
      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/store-owner/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to create credit entry. Please try again.')
    } finally {
      setCreatingCredit(false)
    }
  }

  const getReputationColor = (score: number) => {
    if (score >= 850) return 'text-chart-2'
    if (score >= 700) return 'text-chart-4'
    return 'text-chart-1'
  }

  if (success) {
    return (
      <DashboardLayout userType="store-owner">
        <div className="max-w-2xl mx-auto">
          <Card className="border-chart-2/50 bg-chart-2/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-chart-2/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Credit Entry Created!</h2>
                  <p className="text-muted-foreground mt-2">
                    Credit of {formatNPR(Math.round(parseFloat(creditAmount) * 100))} has been issued to {selectedBorrower?.full_name}
                  </p>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="store-owner">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Credit Entry</h1>
          <p className="text-muted-foreground mt-1">
            Issue credit to a verified borrower
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['Search', 'Verify', 'Details', 'Confirm'].map((stepName, index) => {
            const stepValue = ['search', 'verify', 'details', 'confirm'][index]
            const isActive = step === stepValue
            const isPast = ['search', 'verify', 'details', 'confirm'].indexOf(step) > index
            
            return (
              <div key={stepName} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isPast ? 'bg-primary text-primary-foreground' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isPast ? <CheckCircle className="h-5 w-5" /> : index + 1}
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {stepName}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`h-px flex-1 ${isPast ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Search Borrower */}
        {step === 'search' && (
          <Card>
            <CardHeader>
              <CardTitle>Find Borrower</CardTitle>
              <CardDescription>
                Search by wallet address, email, or name
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Borrower</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    placeholder="Enter wallet address, email, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBorrower()}
                  />
                  <Button onClick={handleSearchBorrower} disabled={searching || !searchQuery}>
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="pt-4">
                  <p className="text-sm font-medium mb-3">Search Results</p>
                  <div className="space-y-2">
                    {searchResults.map((borrower: any) => (
                      <button
                        key={borrower.id}
                        onClick={() => {
                          setSelectedBorrower(borrower)
                          setStep('verify')
                        }}
                        className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{borrower.full_name}</p>
                            <p className="text-xs text-muted-foreground">{borrower.borrower_pubkey?.slice(0, 8)}...{borrower.borrower_pubkey?.slice(-8)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {borrower.reputation_score != null && (
                              <span className={`text-sm font-bold flex items-center gap-1 ${
                                borrower.reputation_score >= 700 ? 'text-emerald-600 dark:text-emerald-400' :
                                borrower.reputation_score >= 550 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                <TrendingUp className="h-3 w-3" />{borrower.reputation_score}
                              </span>
                            )}
                            <Badge variant={borrower.citizenship_verified ? 'default' : 'secondary'}>
                              {borrower.citizenship_verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <p className="text-sm font-medium mb-3">Recent Borrowers</p>
                <div className="space-y-2">
                  {recentBorrowers.slice(0, 3).map((borrower: any) => (
                    <button
                      key={borrower.id}
                      onClick={() => {
                        setSelectedBorrower(borrower)
                        setStep('verify')
                      }}
                      className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{borrower.full_name}</p>
                          <p className="text-xs text-muted-foreground">{borrower.borrower_pubkey?.slice(0, 8)}...{borrower.borrower_pubkey?.slice(-8)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {borrower.reputation_score != null && (
                            <span className={`text-sm font-bold flex items-center gap-1 ${
                              borrower.reputation_score >= 700 ? 'text-emerald-600 dark:text-emerald-400' :
                              borrower.reputation_score >= 550 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              <TrendingUp className="h-3 w-3" />{borrower.reputation_score}
                            </span>
                          )}
                          <Badge variant={borrower.citizenship_verified ? 'default' : 'secondary'}>
                            {borrower.citizenship_verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                  {recentBorrowers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent borrowers found
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify Borrower */}
        {step === 'verify' && selectedBorrower && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Borrower Details</CardTitle>
              <CardDescription>
                Review borrower information before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-semibold mt-1">{selectedBorrower.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedBorrower.citizenship_verified ? 'default' : 'secondary'}>
                      {selectedBorrower.citizenship_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Wallet</Label>
                  <p className="font-mono text-sm mt-1 break-all">{selectedBorrower.borrower_pubkey}</p>
                </div>
                {selectedBorrower.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-sm mt-1">{selectedBorrower.email}</p>
                  </div>
                )}
              </div>

              {/* Live reputation widget */}
              <div>
                <Label className="text-muted-foreground block mb-2">Borrower Reputation</Label>
                <ReputationBadge borrowerPubkey={selectedBorrower.borrower_pubkey} />
              </div>

              {!selectedBorrower.citizenship_verified_at && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cannot proceed.</strong> This borrower has not completed NID verification.
                    They must verify their identity before you can issue credit to them.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('search')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep('details')}
                  className="flex-1"
                  disabled={!selectedBorrower.citizenship_verified_at}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Credit Details */}
        {step === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle>Credit Details</CardTitle>
              <CardDescription>
                Enter the credit amount and terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Credit Amount*</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NPR">NPR (रू)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description*</Label>
                <Textarea
                  id="description"
                  placeholder="What is this credit for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date*</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest">Interest Rate (% per month)</Label>
                  <Input
                    id="interest"
                    type="number"
                    placeholder="0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collateral">Collateral (Optional)</Label>
                <Input
                  id="collateral"
                  placeholder="Description of collateral if any"
                  value={collateral}
                  onChange={(e) => setCollateral(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('verify')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep('confirm')} 
                  className="flex-1"
                  disabled={!creditAmount || !description || !dueDate}
                >
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Credit Entry</CardTitle>
              <CardDescription>
                Review all details before creating the credit entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Borrower</span>
                  <span className="font-medium">{selectedBorrower?.full_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Credit Amount</span>
                  <span className="font-semibold text-lg">
                    {currency === 'NPR' ? 'रू ' : currency === 'USD' ? '$' : '€'}
                    {parseFloat(creditAmount).toLocaleString('en-NP')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium text-right max-w-xs">{description}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{dueDate && format(dueDate, 'PPP')}</span>
                </div>
                {interestRate && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Interest Rate</span>
                    <span className="font-medium">{interestRate}% per month</span>
                  </div>
                )}
                {collateral && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Collateral</span>
                    <span className="font-medium text-right max-w-xs">{collateral}</span>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A soulbound NFT will be minted on Solana blockchain as proof of this credit entry.
                  This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCreateCredit} className="flex-1" disabled={creatingCredit}>
                  {creatingCredit ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Credit Entry'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
