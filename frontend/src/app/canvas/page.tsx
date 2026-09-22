import type { Metadata } from 'next';
import SpatialCanvasView from '@/components/spatial-canvas/SpatialCanvasView';

export const metadata: Metadata = {
  title: 'Spatial Canvas Workspace | INDRA',
  description: 'Infinite 2D spatial workspace for non-linear industrial AI reasoning',
};

export default function SpatialCanvasPage() {
  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
      <SpatialCanvasView />
    </div>
  );
}
