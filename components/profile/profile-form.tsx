"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { PasswordChangeSchema } from "@/schemas";
import { changePassword } from "@/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const ProfileForm = () => {
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<z.infer<typeof PasswordChangeSchema>>({
        resolver: zodResolver(PasswordChangeSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = (values: z.infer<typeof PasswordChangeSchema>) => {
        setError("");
        setSuccess("");

        startTransition(() => {
            changePassword(values).then((data) => {
                if (data?.error) {
                    setError(data.error);
                }
                if (data?.success) {
                    setSuccess(data.success);
                    reset();
                }
            });
        });
    };

    return (
        <Card className="max-w-[600px]">
            <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                    Actualiza tu contraseña de acceso al sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Contraseña Actual</Label>
                            <Input
                                {...register("currentPassword")}
                                id="currentPassword"
                                disabled={isPending}
                                placeholder="******"
                                type="password"
                            />
                            {errors.currentPassword && (
                                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nueva Contraseña</Label>
                            <Input
                                {...register("newPassword")}
                                id="newPassword"
                                disabled={isPending}
                                placeholder="******"
                                type="password"
                            />
                            {errors.newPassword && (
                                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                            <Input
                                {...register("confirmPassword")}
                                id="confirmPassword"
                                disabled={isPending}
                                placeholder="******"
                                type="password"
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </div>
                    {error && (
                        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
                            <p>{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-emerald-500">
                            <p>{success}</p>
                        </div>
                    )}
                    <Button type="submit" className="w-full" disabled={isPending}>
                        Actualizar Contraseña
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
