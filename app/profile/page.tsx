import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Perfil de Usuario</h2>
            </div>
            <div className="grid gap-4 grid-cols-1">
                <ProfileForm />
            </div>
        </div>
    );
}
