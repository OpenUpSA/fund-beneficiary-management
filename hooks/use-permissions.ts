import { useSession } from 'next-auth/react'
import { permissions, type User, type LDA, type Document, type Media } from '@/lib/permissions'
import { Role } from '@prisma/client'

export function usePermissions() {
  const { data: session } = useSession()
  
  const currentUser: User | null = session?.user ? {
    id: session.user.id,
    role: session.user.role as Role,
  } : null

  return {
    currentUser,
    
    // User role checks
    isSuperUser: () => currentUser ? permissions.isSuperUser(currentUser) : false,
    isAdmin: () => currentUser ? permissions.isAdmin(currentUser) : false,
    isProgrammeOfficer: () => currentUser ? permissions.isProgrammeOfficer(currentUser) : false,
    isLDAUser: () => currentUser ? permissions.isLDAUser(currentUser) : false,

    // LDA permissions
    canManageLDA: (ldaId: number) => currentUser ? permissions.canManageLDA(currentUser, ldaId) : false,
    canViewLDA: (ldaId: number) => currentUser ? permissions.canViewLDA(currentUser, ldaId) : false,
    canCreateLDA: () => currentUser ? permissions.canCreateLDA(currentUser) : false,
    canDeleteLDA: () => currentUser ? permissions.canDeleteLDA(currentUser) : false,

    // User management permissions
    canCreateUser: (targetRole: Role) => currentUser ? permissions.canCreateUser(currentUser, targetRole) : false,
    canDeleteUser: (targetRole: Role) => currentUser ? permissions.canDeleteUser(currentUser) : false,
    canEditUser: (targetUser: User) => currentUser ? permissions.canEditUser(currentUser, targetUser) : false,
    canDeleteSpecificUser: (targetUser: User) => currentUser ? permissions.canDeleteSpecificUser(currentUser) : false,
    canCreateAdmin: () => currentUser ? permissions.canCreateAdmin(currentUser) : false,
    canDeleteAdmin: () => currentUser ? permissions.canDeleteAdmin(currentUser) : false,

    // Document permissions
    canViewDocument: (document: Document, lda?: LDA) => currentUser ? permissions.canViewDocument(currentUser, document, lda) : false,
    canEditDocument: (document: Document, lda?: LDA) => currentUser ? permissions.canEditDocument(currentUser, document, lda) : false,
    canDeleteDocument: (document: Document, lda?: LDA) => currentUser ? permissions.canDeleteDocument(currentUser, document, lda) : false,
    canCreateDocument: (uploadType: 'Funder' | 'Fund' | 'SCAT' | 'LDA') => currentUser ? permissions.canCreateDocument(currentUser, uploadType) : false,

    // Media permissions
    canViewMedia: (media: Media, lda?: LDA) => currentUser ? permissions.canViewMedia(currentUser, media, lda) : false,
    canEditMedia: (media: Media, lda?: LDA) => currentUser ? permissions.canEditMedia(currentUser, media, lda) : false,
    canDeleteMedia: (media: Media, lda?: LDA) => currentUser ? permissions.canDeleteMedia(currentUser, media, lda) : false,
    canCreateMedia: () => currentUser ? permissions.canCreateMedia(currentUser) : false,

    // Form permissions
    canCreateNewApplication: () => currentUser ? permissions.canCreateNewApplication(currentUser) : false,
    canViewDashboardStats: () => currentUser ? permissions.canViewDashboardStats(currentUser) : false,
  }
}
