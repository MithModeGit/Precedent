import { ProcessingScreen } from '@/components/processing/ProcessingScreen'

// Standalone processing route. The main flow renders ProcessingScreen inline during the
// classify and redline calls; this exists for completeness if navigated to directly.
export default function ProcessingPage(): React.ReactElement {
  return <ProcessingScreen stage={0} />
}
