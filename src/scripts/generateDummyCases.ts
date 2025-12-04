/**
 * Script to generate dummy cases for testing the CaseListView
 * 
 * Usage:
 * 1. Import in browser console: import('./scripts/generateDummyCases').then(m => m.generateDummyCases())
 * 2. Or add to a dev menu/button
 */

import { caseService } from '../services/caseService';
import { toast } from '../hooks/useToast';

interface DummyCaseConfig {
  name: string;
  caseId?: string;
  department?: string;
  client?: string;
  deploymentMode?: 'local' | 'cloud';
  daysAgo?: number; // How many days ago it was last opened (for testing recent cases)
}

const DUMMY_CASES: DummyCaseConfig[] = [
  // Recent cases (last 7 days)
  { name: 'Smith v. Johnson - Contract Dispute', caseId: 'CASE-2024-001', department: 'Litigation', client: 'Smith & Associates', deploymentMode: 'cloud', daysAgo: 1 },
  { name: 'Acme Corp - Merger Review', caseId: 'CASE-2024-002', department: 'Corporate', client: 'Acme Corporation', deploymentMode: 'local', daysAgo: 2 },
  { name: 'Data Breach Investigation - TechCo', caseId: 'CASE-2024-003', department: 'Cybersecurity', client: 'TechCo Inc', deploymentMode: 'cloud', daysAgo: 3 },
  { name: 'Employment Dispute - Manufacturing', caseId: 'CASE-2024-004', department: 'Employment', client: 'Manufacturing Corp', deploymentMode: 'local', daysAgo: 5 },
  { name: 'IP Litigation - Software Patent', caseId: 'CASE-2024-005', department: 'Intellectual Property', client: 'Software Solutions LLC', deploymentMode: 'cloud', daysAgo: 6 },
  
  // Older cases (8+ days ago)
  { name: 'Real Estate Transaction - Downtown', caseId: 'CASE-2024-006', department: 'Real Estate', client: 'Property Developers', deploymentMode: 'local', daysAgo: 10 },
  { name: 'Tax Audit - Financial Services', caseId: 'CASE-2024-007', department: 'Tax', client: 'Financial Services Group', deploymentMode: 'cloud', daysAgo: 15 },
  { name: 'Regulatory Compliance - Healthcare', caseId: 'CASE-2024-008', department: 'Healthcare', client: 'Health Systems Inc', deploymentMode: 'local', daysAgo: 20 },
  { name: 'Securities Investigation', caseId: 'CASE-2024-009', department: 'Securities', client: 'Investment Bank', deploymentMode: 'cloud', daysAgo: 25 },
  { name: 'Antitrust Review - Retail', caseId: 'CASE-2024-010', department: 'Antitrust', client: 'Retail Chain Corp', deploymentMode: 'local', daysAgo: 30 },
  
  // More cases for testing large lists
  { name: 'Environmental Compliance - Energy', caseId: 'CASE-2024-011', department: 'Environmental', client: 'Energy Company', deploymentMode: 'cloud', daysAgo: 35 },
  { name: 'Labor Relations - Union Negotiation', caseId: 'CASE-2024-012', department: 'Labor', client: 'Manufacturing Corp', deploymentMode: 'local', daysAgo: 40 },
  { name: 'Bankruptcy Proceedings - Retail', caseId: 'CASE-2024-013', department: 'Bankruptcy', client: 'Retail Chain Corp', deploymentMode: 'cloud', daysAgo: 45 },
  { name: 'Immigration Case - Tech Worker', caseId: 'CASE-2024-014', department: 'Immigration', client: 'Tech Startup', deploymentMode: 'local', daysAgo: 50 },
  { name: 'Family Law - Divorce Settlement', caseId: 'CASE-2024-015', department: 'Family Law', client: 'Private Client', deploymentMode: 'cloud', daysAgo: 55 },
  
  // Cases with same department/client for filter testing
  { name: 'Another Litigation Case', caseId: 'CASE-2024-016', department: 'Litigation', client: 'Smith & Associates', deploymentMode: 'local', daysAgo: 60 },
  { name: 'Corporate Restructuring', caseId: 'CASE-2024-017', department: 'Corporate', client: 'Acme Corporation', deploymentMode: 'cloud', daysAgo: 65 },
  { name: 'Cybersecurity Audit', caseId: 'CASE-2024-018', department: 'Cybersecurity', client: 'TechCo Inc', deploymentMode: 'local', daysAgo: 70 },
  
  // Cases without optional fields
  { name: 'General Legal Matter', daysAgo: 75 },
  { name: 'Confidential Case', daysAgo: 80 },
  { name: 'Pro Bono Work', daysAgo: 85 },
  
  // Many more cases for testing 20+ threshold
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `Test Case ${i + 20}`,
    caseId: `TEST-${String(i + 20).padStart(3, '0')}`,
    department: i % 2 === 0 ? 'Litigation' : 'Corporate',
    client: i % 3 === 0 ? 'Client A' : i % 3 === 1 ? 'Client B' : 'Client C',
    deploymentMode: (i % 2 === 0 ? 'local' : 'cloud') as 'local' | 'cloud',
    daysAgo: 90 + i * 2,
  })),
];

/**
 * Generate dummy cases with various properties for testing
 */
export async function generateDummyCases(count?: number): Promise<void> {
  const casesToGenerate = count ? DUMMY_CASES.slice(0, count) : DUMMY_CASES;
  const total = casesToGenerate.length;
  let created = 0;
  let errors = 0;

  console.log(`Generating ${total} dummy cases...`);

  for (const config of casesToGenerate) {
    try {
      // Use cloud URIs as sources (they don't require file system validation)
      const sources = [
        `cloud://test-bucket/cases/${config.caseId || config.name.replace(/\s+/g, '-').toLowerCase()}/documents/`
      ];

      await caseService.createCase(
        config.name,
        sources,
        config.caseId,
        config.department,
        config.client
      );

      created++;
      
      // If we need to simulate different last_opened_at times, we'd need a backend command
      // For now, cases will have current timestamp
      console.log(`✓ Created: ${config.name} (${created}/${total})`);

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      errors++;
      console.error(`✗ Failed to create case "${config.name}":`, error);
    }
  }

  const message = `Created ${created} out of ${total} dummy cases${errors > 0 ? ` (${errors} errors)` : ''}`;
  console.log(message);
  
  toast({
    title: 'Dummy Cases Generated',
    description: message,
    variant: errors > 0 ? 'destructive' : 'default',
  });
}

/**
 * Generate a specific number of cases with random properties
 */
export async function generateRandomCases(count: number): Promise<void> {
  const departments = ['Litigation', 'Corporate', 'Cybersecurity', 'Employment', 'Intellectual Property', 'Tax', 'Real Estate'];
  const clients = ['Acme Corp', 'TechCo Inc', 'Smith & Associates', 'Manufacturing Corp', 'Financial Services Group', 'Health Systems Inc'];
  const deploymentModes: ('local' | 'cloud')[] = ['local', 'cloud'];

  const cases: DummyCaseConfig[] = Array.from({ length: count }, (_, i) => {
    const department = departments[i % departments.length];
    const client = clients[i % clients.length];
    const deploymentMode = deploymentModes[i % deploymentModes.length];
    return {
      name: `Test Case ${i + 1}`,
      caseId: `TEST-${String(i + 1).padStart(4, '0')}`,
      ...(department && { department }),
      ...(client && { client }),
      ...(deploymentMode && { deploymentMode }),
      daysAgo: Math.floor(Math.random() * 90), // Random days ago (0-90)
    };
  });

  // Temporarily replace DUMMY_CASES
  const originalCases = DUMMY_CASES;
  (DUMMY_CASES as any).length = 0;
  DUMMY_CASES.push(...cases);

  try {
    await generateDummyCases(count);
  } finally {
    // Restore original cases
    (DUMMY_CASES as any).length = 0;
    DUMMY_CASES.push(...originalCases);
  }
}

/**
 * Clear all dummy cases (cases with TEST- prefix or "Test Case" in name)
 */
export async function clearDummyCases(): Promise<void> {
  try {
    const allCases = await caseService.listCases();
    const dummyCases = allCases.filter(c => 
      c.case_id?.startsWith('TEST-') || 
      c.case_id?.startsWith('CASE-2024-') ||
      c.name.includes('Test Case') ||
      c.name.includes('Dummy')
    );

    if (dummyCases.length === 0) {
      toast({
        title: 'No dummy cases found',
        description: 'No cases matching dummy case patterns were found.',
      });
      return;
    }

    let deleted = 0;
    for (const case_ of dummyCases) {
      try {
        await caseService.deleteCase(case_.id);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete case "${case_.name}":`, error);
      }
    }

    toast({
      title: 'Dummy Cases Cleared',
      description: `Deleted ${deleted} out of ${dummyCases.length} dummy cases.`,
    });
  } catch (error) {
    console.error('Failed to clear dummy cases:', error);
    toast({
      title: 'Failed to clear dummy cases',
      description: error instanceof Error ? error.message : 'An error occurred.',
      variant: 'destructive',
    });
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).generateDummyCases = generateDummyCases;
  (window as any).generateRandomCases = generateRandomCases;
  (window as any).clearDummyCases = clearDummyCases;
}

