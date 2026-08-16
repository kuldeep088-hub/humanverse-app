'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'

export default function PseudonymSettingsPage() {
  const [pseudonymName, setPseudonymName] = useState('')
  const [hasPseudonym, setHasPseudonym] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveType, setSaveType] = useState<'update' | 'delete' | ''>('')
  const supabase = createClient()

  const fetchPseudonym = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: pseudo } = await supabase
      .from('pseudonyms')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    if (pseudo) {
      setPseudonymName(pseudo.display_name)
      setHasPseudonym(true)
    }
  }, [supabase])

  useEffect(() => {
    const run = async () => {
      await fetchPseudonym()
    }
    run()
  }, [fetchPseudonym])

  const handleSave = async () => {
    setIsLoading(true)
    setSaveType('update')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (pseudonymName.trim()) {
        const { error } = await supabase.from('pseudonyms').upsert({
          user_id: user.id,
          display_name: pseudonymName,
        })
        if (error) throw error
      } else if (hasPseudonym) {
        const { error } = await supabase.from('pseudonyms').delete().eq('user_id', user.id)
        if (error) throw error
        setHasPseudonym(false)
      }

      toast.success('Saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete your pseudonym? This cannot be undone.')) return
    setIsLoading(true)
    setSaveType('delete')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('pseudonyms').delete().eq('user_id', user.id)
      if (error) throw error

      setPseudonymName('')
      setHasPseudonym(false)
      toast.success('Pseudonym deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-medium text-gray-950 dark:text-white">Pseudonym</h1>

      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A persistent alias for pseudonymous posts. Your posting history stays attached to this name.
          Your real identity is never linked to it in the database.
        </p>

        <div>
          <Label htmlFor="pseudonymName">Pseudonym name</Label>
          <Input
            id="pseudonymName"
            value={pseudonymName}
            onChange={(e) => setPseudonymName(e.target.value)}
            placeholder="Choose a pseudonym"
            disabled={isLoading}
          />
        </div>

        {hasPseudonym && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current pseudonym: <strong>{pseudonymName}</strong>
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Leave blank to remove your pseudonym. You can create a new one later.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isLoading}>
          {saveType === 'update' && isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : hasPseudonym ? (
            'Update pseudonym'
          ) : (
            'Create pseudonym'
          )}
        </Button>

        {hasPseudonym && (
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {saveType === 'delete' && isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete pseudonym
              </>
            )}
          </Button>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <h2 className="font-medium text-gray-950 dark:text-white mb-3">How it works</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
          <li>When you post pseudonymously, the post stores your pseudonym_id, not your user_id.</li>
          <li>There is no database view that joins pseudonyms to accounts.</li>
          <li>We cannot identify the author of a pseudonymous post.</li>
          <li>Your pseudonymous posts are publicly visible but attributed to your pseudonym.</li>
          <li>Deleting your pseudonym removes the pseudonym record but keeps your pseudonymous posts (attributed to the pseudonym name).</li>
        </ul>
      </div>
    </div>
  )
}