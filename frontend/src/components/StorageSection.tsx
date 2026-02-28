import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StorageBar } from "@/components/StorageBar";
import type { StorageDisk } from "@/types";

interface StorageSectionProps {
    storage: StorageDisk[];
}

export function StorageSection({ storage }: StorageSectionProps) {
    const [storageAccordion, setStorageAccordion] = useState<string>("");
    if (storage.length === 0) return null;

    const rootDisks = storage.filter((d) => d.mountpoint === "/");
    const otherDisks = storage.filter((d) => d.mountpoint !== "/");
    const mid = Math.ceil(otherDisks.length / 2);
    const col1 = otherDisks.slice(0, mid);
    const col2 = otherDisks.slice(mid);

    return (
        <Card className="mb-6">
            <CardContent>
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Storage</CardTitle>
                <div className="flex flex-col gap-4">
                    {rootDisks.map((disk) => (
                        <StorageBar key={disk.mountpoint} disk={disk} />
                    ))}
                    {otherDisks.length > 0 && (
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                            value={storageAccordion}
                            onValueChange={setStorageAccordion}
                        >
                            <AccordionItem value="other-disks" className="border-none">
                                <AccordionTrigger className="py-2 hover:no-underline text-muted-foreground">
                                    Other disks ({otherDisks.length})
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-4">
                                            {col1.map((disk) => (
                                                <StorageBar key={disk.mountpoint} disk={disk} />
                                            ))}
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            {col2.map((disk) => (
                                                <StorageBar key={disk.mountpoint} disk={disk} />
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
