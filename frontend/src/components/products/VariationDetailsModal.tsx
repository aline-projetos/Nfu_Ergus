import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VariationDetails } from '@/lib/api/products';

interface Props {
  open: boolean;
  onClose: () => void;
  combination: string;
  details: VariationDetails;
  onSave: (details: VariationDetails) => void;
}

export function VariationDetailsModal({ open, onClose, combination, details, onSave }: Props) {
  const [form, setForm] = useState<VariationDetails>(() => ({ ...details }));

  const update = (field: keyof VariationDetails, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes: {combination}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Descrição Curta</Label>
            <Input
              value={form.descriptionShort || ''}
              onChange={(e) => update('descriptionShort', e.target.value)}
              placeholder="Descrição curta da variação"
            />
          </div>

          <div>
            <Label className="mb-2 block">Descrição Longa</Label>
            <textarea
              value={form.descriptionLong || ''}
              onChange={(e) => update('descriptionLong', e.target.value)}
              placeholder="Descrição detalhada da variação"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Meta Title</Label>
              <Input
                value={form.metaTitle || ''}
                onChange={(e) => update('metaTitle', e.target.value)}
                placeholder="Meta título"
              />
            </div>
            <div>
              <Label className="mb-2 block">Meta Tag</Label>
              <Input
                value={form.metaTag || ''}
                onChange={(e) => update('metaTag', e.target.value)}
                placeholder="Meta tags"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Meta Description</Label>
            <textarea
              value={form.metaDescription || ''}
              onChange={(e) => update('metaDescription', e.target.value)}
              placeholder="Meta descrição"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Link do Vídeo</Label>
              <Input
                value={form.videoLink || ''}
                onChange={(e) => update('videoLink', e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div>
              <Label className="mb-2 block">Outros Links</Label>
              <Input
                value={form.otherLinks || ''}
                onChange={(e) => update('otherLinks', e.target.value)}
                placeholder="Links adicionais"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
