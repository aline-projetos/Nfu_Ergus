import { useState, useRef } from 'react';
import { Plus, Trash2, Upload, Link as LinkIcon, Star } from 'lucide-react';
import { toast } from 'sonner';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface VariationImage {
  id: string;
  url: string;
  isPrimary: boolean;
  position?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  combination: string;
  images: VariationImage[];
  onSave: (images: VariationImage[]) => void;
}

type ImageDraft = VariationImage & { inputMode: 'upload' | 'url'; urlInput: string };

export function VariationImageModal({ open, onClose, combination, images, onSave }: Props) {
  const [drafts, setDrafts] = useState<ImageDraft[]>(() =>
    images.map(img => ({ ...img, inputMode: img.url.startsWith('blob:') ? 'upload' : 'url', urlInput: img.url.startsWith('blob:') ? '' : img.url }))
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addImageRow = () => {
    setDrafts(prev => [
      ...prev,
      {
        id: String(Date.now()) + '_' + Math.random().toString(36).slice(2, 6),
        url: '',
        isPrimary: prev.length === 0,
        position: undefined,
        inputMode: 'upload',
        urlInput: '',
      },
    ]);
  };

  const removeImage = (imageId: string) => {
    setDrafts(prev => {
      const filtered = prev.filter(d => d.id !== imageId);
      // If we removed the primary, set first as primary
      if (filtered.length > 0 && !filtered.some(d => d.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return [...filtered];
    });
  };

  const setImagePrimary = (imageId: string) => {
    setDrafts(prev =>
      prev.map(d => ({
        ...d,
        isPrimary: d.id === imageId,
        position: d.id === imageId ? undefined : d.position,
      }))
    );
  };

  const updateImagePosition = (imageId: string, pos: number) => {
    setDrafts(prev => prev.map(d => (d.id === imageId ? { ...d, position: pos } : d)));
  };

  const handleFileChange = (imageId: string, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDrafts(prev => prev.map(d => (d.id === imageId ? { ...d, url, inputMode: 'upload' } : d)));
  };

  const handleUrlConfirm = (imageId: string) => {
    setDrafts(prev =>
      prev.map(d => {
        if (d.id !== imageId) return d;
        if (!d.urlInput.trim()) {
          toast.error('Informe uma URL válida');
          return d;
        }
        return { ...d, url: d.urlInput.trim() };
      })
    );
  };

  const handleSave = () => {
    if (drafts.length === 0) {
      // allow saving empty (clears images)
      onSave([]);
      onClose();
      return;
    }

    // Validate all have urls
    if (drafts.some(d => !d.url)) {
      toast.error('Todas as imagens devem ter um arquivo ou URL');
      return;
    }

    // Ensure max 1 primary
    const primaryCount = drafts.filter(d => d.isPrimary).length;
    const finalDrafts = [...drafts];
    if (primaryCount === 0) {
      finalDrafts[0].isPrimary = true;
    }

    // Validate non-primary have position
    for (const d of finalDrafts) {
      if (!d.isPrimary && (d.position == null || d.position < 1)) {
        toast.error(`Defina a posição para a imagem não-principal`);
        return;
      }
    }

    const result: VariationImage[] = finalDrafts.map(d => ({
      id: d.id,
      url: d.url,
      isPrimary: d.isPrimary,
      position: d.isPrimary ? undefined : d.position,
    }));

    onSave(result);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imagens da variação: {combination}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma imagem adicionada. Clique em "+ Adicionar imagem" abaixo.
            </p>
          )}

          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
            >
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {draft.url ? (
                    <img
                      src={draft.url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Upload / URL toggle */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={draft.inputMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setDrafts(prev =>
                          prev.map(d => (d.id === draft.id ? { ...d, inputMode: 'upload' } : d))
                        )
                      }
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant={draft.inputMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setDrafts(prev =>
                          prev.map(d => (d.id === draft.id ? { ...d, inputMode: 'url' } : d))
                        )
                      }
                    >
                      <LinkIcon className="w-3 h-3 mr-1" />
                      URL
                    </Button>
                  </div>

                  {draft.inputMode === 'upload' ? (
                    <div>
                      <input
                        ref={(el) => { fileInputRefs.current[draft.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(draft.id, e.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[draft.id]?.click()}
                      >
                        Selecionar arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={draft.urlInput}
                        onChange={(e) =>
                          setDrafts(prev =>
                            prev.map(d =>
                              d.id === draft.id ? { ...d, urlInput: e.target.value } : d
                            )
                          )
                        }
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => handleUrlConfirm(draft.id)}>
                        Aplicar
                      </Button>
                    </div>
                  )}

                  {/* Primary + Position */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`primary-${draft.id}`}
                        checked={draft.isPrimary}
                        onCheckedChange={() => setImagePrimary(draft.id)}
                      />
                      <Label htmlFor={`primary-${draft.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Principal
                      </Label>
                    </div>

                    {!draft.isPrimary && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Posição:</Label>
                        <Select
                          value={draft.position != null ? String(draft.position) : ''}
                          onValueChange={(v) => updateImagePosition(draft.id, Number(v))}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue placeholder="#" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeImage(draft.id)}
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addImageRow} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar imagem
          </Button>
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
