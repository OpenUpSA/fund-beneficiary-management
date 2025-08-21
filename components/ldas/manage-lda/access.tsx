"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AccessLevel } from "@prisma/client";

type User = {
  id: number;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
};

interface AccessTabProps {
  userAccess: User[];
  ldaId: number;
  callback: (tag: string) => void
}

export function AccessTab({ userAccess = [], ldaId, callback }: AccessTabProps) {
  const [users, setUsers] = useState<User[]>(userAccess);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [newUser, setNewUser] = useState<User>({
    id: 0,
    fullName: "",
    email: "",
    accessLevel: "ReadOnly",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Email validation regex
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const handleAdd = () => {
    setAdding(true);
    setNewUser({
      id: 0,
      fullName: "",
      email: "",
      accessLevel: "ReadOnly",
    });
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    if (!email || !email.trim()) {
      toast.error("Email is required");
      return false;
    }
    
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Invalid email format");
      return false;
    }
    
    return true;
  };
  
  // Function to save a new user access
  const handleSave = async (user: User) => {
    // Validate email before submission
    if (!validateEmail(user.email)) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/lda/${ldaId}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add user access");
      }

      const savedUser = await response.json();
      setUsers([...users, savedUser]);
      setAdding(false);
      toast.success("User access added successfully");
      callback(`lda-${ldaId}`);
    } catch (error) {
      console.error("Error adding user access:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add user access");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to update an existing user access
  const handleUpdate = async (user: User) => {
    // Validate email before submission
    if (!validateEmail(user.email)) {
      setIsSubmitting(false);
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/lda/${ldaId}/access/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user access");
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      setEditingId(null);
      setEditedUser(null);
      toast.success("User access updated successfully");
      callback(`lda-${ldaId}`);
    } catch (error) {
      console.error("Error updating user access:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAdding(false);
  };

  // Function to edit an existing user
  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditedUser({ ...user });
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedUser(null);
  };

  // Function to open delete confirmation dialog
  const openDeleteDialog = (id: number) => {
    setUserToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Function to delete a user access
  const handleDelete = async () => {
    if (!userToDelete) return;
    
    setDeleteDialogOpen(false);
    
    try {
      const response = await fetch(`/api/lda/${ldaId}/access/${userToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user access");
      }

      setUsers(users.filter(user => user.id !== userToDelete));
      toast.success("User access deleted successfully");
    } catch (error) {
      console.error("Error deleting user access:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete user access");
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user access from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">User Access</h2>
        <Button 
          onClick={handleAdd} 
          type="button" 
          className="bg-slate-900 hover:bg-slate-800 text-white"
          size="sm"
        >
          + Add user
        </Button>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium text-gray-500 tracking-wider">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email address</th>
              <th className="py-3 px-4">Access Level</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-slate-700">
            {users.map((user) => {
              const isEditing = editingId === user.id;
              
              return (
                <tr key={user.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-gray-50' : ''}`}>
                  <td className="py-3 px-4 whitespace-nowrap text-xs">
                    {isEditing && editedUser ? (
                      <input
                        className="border rounded px-3 py-1.5 text-xs w-full"
                        placeholder="Full name"
                        value={editedUser.fullName}
                        onChange={e => setEditedUser({ ...editedUser, fullName: e.target.value })}
                        autoFocus
                      />
                    ) : (
                      user.fullName
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {isEditing && editedUser ? (
                      <input
                        className="border rounded px-3 py-1.5 text-xs w-full"
                        placeholder="Email address"
                        value={editedUser.email}
                        onChange={e => setEditedUser({ ...editedUser, email: e.target.value })}
                      />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {isEditing && editedUser ? (
                      <Select
                        value={editedUser.accessLevel}
                        onValueChange={(value) => setEditedUser({ ...editedUser, accessLevel: value as AccessLevel })}
                      >
                        <SelectTrigger className="w-full text-xs h-8">
                          <SelectValue placeholder="Access Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Access Level</SelectLabel>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="ReadOnly">Read-only</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : (
                      user.accessLevel === "ReadOnly" ? "Read-only" : user.accessLevel
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEditing && editedUser ? (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          onClick={() => handleUpdate(editedUser)} 
                          type="button"
                          variant="default" 
                          size="sm" 
                          className="bg-slate-900 hover:bg-slate-800"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button 
                          onClick={handleCancelEdit}
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="border-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user.id)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              );
            })}
            {adding && (
              <tr className="bg-gray-50">
                <td className="py-3 px-4">
                  <input
                    className="border rounded px-3 py-1.5 text-xs w-full"
                    placeholder="Full name"
                    value={newUser.fullName}
                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                    autoFocus
                  />
                </td>
                <td className="py-3 px-4 text-xs">
                  <input
                    className="border rounded px-3 py-1.5 text-xs w-full"
                    placeholder="Email address"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </td>
                <td className="py-3 px-4">
                  <Select
                    value={newUser.accessLevel}
                    onValueChange={(value) => setNewUser({ ...newUser, accessLevel: value as AccessLevel })}
                  >
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Access Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Access Level</SelectLabel>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="ReadOnly">Read-only</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button 
                      onClick={() => handleSave(newUser)} 
                      type="button"
                      variant="default" 
                      size="sm" 
                      className="bg-slate-900 hover:bg-slate-800"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button 
                      onClick={handleCancel}
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="border-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state when no access members */}
            {users.length === 0 && !adding && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No access members added yet
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
      <div className="text-gray-500 text-sm mt-4">
        These LDA staff members will be given various levels of access to perform actions.
      </div>
    </div>
  );
}