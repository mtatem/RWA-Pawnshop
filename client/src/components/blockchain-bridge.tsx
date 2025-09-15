import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Infinity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const bridgeSchema = z.object({
  sourceChain: z.string().min(1, "Source chain is required"),
  contractAddress: z.string().min(1, "Contract address is required"),
  destinationAddress: z.string().min(1, "Destination address is required"),
  userId: z.string().default("mock-user-id"),
});

type BridgeFormData = z.infer<typeof bridgeSchema>;

export default function BlockchainBridge() {
  const { toast } = useToast();

  const form = useForm<BridgeFormData>({
    resolver: zodResolver(bridgeSchema),
    defaultValues: {
      sourceChain: "",
      contractAddress: "",
      destinationAddress: "",
      userId: "mock-user-id",
    },
  });

  const bridgeMutation = useMutation({
    mutationFn: async (data: BridgeFormData) => {
      const bridgeData = {
        ...data,
        destinationChain: "ICP",
        sourceAddress: data.contractAddress,
        bridgeFee: "0.5",
        status: "pending",
      };

      const response = await apiRequest("POST", "/api/bridge/transfer", bridgeData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bridge Transfer Initiated",
        description: `Your bridge transfer has been initiated. Bridge fee: 0.5 ICP`,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Bridge Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const chainIcons: Record<string, string> = {
    ethereum: "🔷",
    polygon: "🟣",
    bsc: "🟡",
    solana: "🌅",
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Cross-Chain Bridge</h2>
          <p className="text-muted-foreground">Convert your RWAs from other blockchains to ICP</p>
        </div>

        <Card className="bg-card border border-border p-8 glass-effect">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => bridgeMutation.mutate(data))}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Source Chain */}
                <div className="text-center">
                  <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">
                      {form.watch("sourceChain") ? chainIcons[form.watch("sourceChain")] || "⛓️" : "⛓️"}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2">From</h3>
                  
                  <FormField
                    control={form.control}
                    name="sourceChain"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-chain">
                              <SelectValue placeholder="Select chain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="polygon">Polygon</SelectItem>
                            <SelectItem value="bsc">BSC</SelectItem>
                            <SelectItem value="solana">Solana</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="contractAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Contract Address"
                              className="text-sm font-mono"
                              {...field}
                              data-testid="input-contract-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Bridge Arrow */}
                <div className="text-center">
                  <div className="bg-primary rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <ArrowRight className="text-primary-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Bridge to ICP</p>
                </div>

                {/* Destination Chain */}
                <div className="text-center">
                  <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Infinity className="text-2xl text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">To</h3>
                  <div className="bg-input border border-border rounded-lg px-4 py-3 text-center">
                    Internet Computer
                  </div>
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="destinationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Your ICP Wallet Address"
                              className="text-sm font-mono"
                              {...field}
                              data-testid="input-destination-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Card className="mt-8 p-4 bg-muted">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Bridge Fee:</span>
                  <span className="font-medium">0.5 ICP</span>
                </div>
              </Card>

              <Button
                type="submit"
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={bridgeMutation.isPending}
                data-testid="button-bridge-transfer"
              >
                {bridgeMutation.isPending ? "Processing..." : "Initialize Bridge Transfer"}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </section>
  );
}
