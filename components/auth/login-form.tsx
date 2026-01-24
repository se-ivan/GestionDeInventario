"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { LoginSchema } from "@/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { Button } from "@/components/ui/button";
import { login } from "@/actions/login";

export const LoginForm = () => {
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = (values: z.infer<typeof LoginSchema>) => {
        setError("");
        setSuccess("");
        
        startTransition(() => {
            login(values).then((data) => {
                if (data?.error) {
                    setError(data.error);
                }
            });
        });
    };

    return (
        <CardWrapper
            headerLabel="Bienvenido de nuevo"
            backButtonLabel=""
            backButtonHref=""
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            {...register("email")}
                            id="email"
                            disabled={isPending}
                            placeholder="john.doe@example.com"
                            type="email"
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            {...register("password")}
                            id="password"
                            disabled={isPending}
                            placeholder="******"
                            type="password"
                        />
                         {errors.password && (
                            <p className="text-sm text-destructive">{errors.password.message}</p>
                        )}
                    </div>
                </div>
                {error && (
                    <div className="bg-red-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-500">
                        <p>{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-emerald-500">
                        <p>{success}</p>
                    </div>
                )}
                <Button type="submit" className="w-full" disabled={isPending}>
                    Ingresar
                </Button>
            </form>
        </CardWrapper>
    );
};
