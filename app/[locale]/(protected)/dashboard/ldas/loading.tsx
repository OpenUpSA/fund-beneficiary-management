import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-5 w-40 bg-muted rounded mb-4" />

      {/* Header skeleton */}
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div className="h-8 w-72 bg-muted rounded" />
      </div>
      
      {/* Map skeleton */}
      <Card className="mb-6 hidden md:block">
        <CardContent className="p-0">
          <div style={{height: 400}} className="w-full bg-muted" />
        </CardContent>
      </Card>
      
      {/* Search and filters skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-48" />
          <div className="hidden md:flex space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      
      {/* Table skeleton */}
      <Card className="w-full">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-650px)] min-h-[300px]">
            <Table className="text-xs w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="h-10"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="h-10"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="h-10"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="h-10"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="h-10"><Skeleton className="h-4 w-16" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="p-2"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-6 w-8" /></TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </TableCell>
                    <TableCell className="p-2"><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Pagination skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}
