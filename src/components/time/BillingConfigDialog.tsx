/**
 * BillingConfigDialog Component
 * 
 * ELITE: Dialog for configuring case billing
 * - Toggle between fixed price and pay rate
 * - Fixed price: single amount input
 * - Pay rate: rate amount + unit selector (hourly, daily, weekly, monthly)
 * - Save/Cancel with validation
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { timeService } from '@/services/timeService';
import type { BillingConfig, BillingType, RateUnit } from '@/types/timeTracking';
import { toast } from '@/hooks/useToast';
import { logError } from '@/lib/logger';

interface BillingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSave?: () => void;
}

export function BillingConfigDialog({
  open,
  onOpenChange,
  caseId,
  onSave,
}: BillingConfigDialogProps) {
  const [billingType, setBillingType] = useState<BillingType>('pay_rate');
  const [fixedPrice, setFixedPrice] = useState<string>('');
  const [payRate, setPayRate] = useState<string>('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('hourly');
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load existing config when dialog opens
  useEffect(() => {
    if (open && caseId) {
      setLoadingConfig(true);
      timeService
        .getCaseBillingConfig(caseId)
        .then((config) => {
          if (config) {
            setBillingType(config.billing_type);
            setFixedPrice(config.fixed_price?.toString() || '');
            setPayRate(config.pay_rate?.toString() || '');
            setRateUnit(config.rate_unit || 'hourly');
          }
        })
        .catch((error) => {
          logError('Failed to load billing config', error);
        })
        .finally(() => {
          setLoadingConfig(false);
        });
    }
  }, [open, caseId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const config: BillingConfig = {
        billing_type: billingType,
        fixed_price: billingType === 'fixed_price' ? parseFloat(fixedPrice) : undefined,
        pay_rate: billingType === 'pay_rate' ? parseFloat(payRate) : undefined,
        rate_unit: billingType === 'pay_rate' ? rateUnit : undefined,
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
      };

      // Validate
      if (billingType === 'fixed_price' && (!fixedPrice || isNaN(parseFloat(fixedPrice)))) {
        toast({
          title: 'Invalid fixed price',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        });
        return;
      }

      if (billingType === 'pay_rate' && (!payRate || isNaN(parseFloat(payRate)))) {
        toast({
          title: 'Invalid pay rate',
          description: 'Please enter a valid rate',
          variant: 'destructive',
        });
        return;
      }

      await timeService.setCaseBillingConfig(caseId, config);
      toast({
        title: 'Billing config saved',
        description: 'Billing configuration has been updated.',
      });
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to save billing config',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (loadingConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Billing Configuration</DialogTitle>
          <DialogDescription>
            Configure how this case should be billed. You can choose between fixed price or pay rate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="fixed_price"
                name="billing_type"
                value="fixed_price"
                checked={billingType === 'fixed_price'}
                onChange={(e) => setBillingType(e.target.value as BillingType)}
                className="h-4 w-4"
              />
              <Label htmlFor="fixed_price" className="cursor-pointer">
                Fixed Price
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="pay_rate"
                name="billing_type"
                value="pay_rate"
                checked={billingType === 'pay_rate'}
                onChange={(e) => setBillingType(e.target.value as BillingType)}
                className="h-4 w-4"
              />
              <Label htmlFor="pay_rate" className="cursor-pointer">
                Pay Rate
              </Label>
            </div>
          </div>

          {billingType === 'fixed_price' ? (
            <div className="space-y-2">
              <Label htmlFor="fixed_price_input">Fixed Price ($)</Label>
              <Input
                id="fixed_price_input"
                type="number"
                step="0.01"
                min="0"
                value={fixedPrice}
                onChange={(e) => setFixedPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Pay Rate</Label>
              <div className="flex items-center gap-2">
                <div className="w-[30%]">
                  <Input
                    id="pay_rate_input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={payRate}
                    onChange={(e) => setPayRate(e.target.value)}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
                <div className="w-[70%]">
                  <Select value={rateUnit} onValueChange={(value) => setRateUnit(value as RateUnit)}>
                    <SelectTrigger id="rate_unit_select" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

