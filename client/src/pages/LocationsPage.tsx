import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, MapPin, Home, PlusCircle, Trash, Edit, Save, X, Building 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// Location types from schema
const LocationType = {
  AIRBNB: 'airbnb',
  EVENT_VENUE: 'event_venue',
  OFFICE: 'office',
  OTHER: 'other'
};

type LocationTypeValues = typeof LocationType[keyof typeof LocationType];

interface Location {
  id: number;
  name: string;
  type: LocationTypeValues;
  address: string;
  description?: string;
  contactInfo?: string;
  createdAt: Date;
  userId?: number;
}

interface LocationFormData {
  name: string;
  type: LocationTypeValues;
  address: string;
  description?: string;
  contactInfo?: string;
}

const defaultFormData: LocationFormData = {
  name: '',
  type: LocationType.OTHER,
  address: '',
  description: '',
  contactInfo: ''
};

const LocationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(LocationType.AIRBNB);
  const [formData, setFormData] = useState<LocationFormData>(defaultFormData);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/locations', null);
      return await response.json();
    }
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const response = await apiRequest('POST', '/api/locations', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setFormData(defaultFormData);
      setIsFormOpen(false);
      toast({
        title: 'Success',
        description: 'Location created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create location: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LocationFormData }) => {
      const response = await apiRequest('PATCH', `/api/locations/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setFormData(defaultFormData);
      setEditingLocationId(null);
      setIsFormOpen(false);
      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update location: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/locations/${id}`, null);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete location: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Filter locations by type
  const filteredLocations = locations.filter((location: Location) => 
    location.type === activeTab
  );

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle dropdown changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingLocationId) {
      updateLocationMutation.mutate({ id: editingLocationId, data: formData });
    } else {
      createLocationMutation.mutate(formData);
    }
  };

  // Handle edit button click
  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      type: location.type,
      address: location.address,
      description: location.description || '',
      contactInfo: location.contactInfo || ''
    });
    setEditingLocationId(location.id);
    setIsFormOpen(true);
  };

  // Handle cancel edit/add
  const handleCancel = () => {
    setFormData(defaultFormData);
    setEditingLocationId(null);
    setIsFormOpen(false);
  };

  // Handle add new location button
  const handleAddNew = () => {
    setFormData({
      ...defaultFormData,
      type: activeTab as LocationTypeValues
    });
    setEditingLocationId(null);
    setIsFormOpen(true);
  };

  // Get icon based on location type
  const getLocationIcon = (type: string) => {
    switch (type) {
      case LocationType.AIRBNB:
        return <Home className="h-5 w-5" />;
      case LocationType.EVENT_VENUE:
        return <Building className="h-5 w-5" />;
      case LocationType.OFFICE:
        return <Building2 className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button onClick={handleAddNew} className="bg-primary">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Location
        </Button>
      </div>

      <Tabs defaultValue={LocationType.AIRBNB} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value={LocationType.AIRBNB}>
            <Home className="h-4 w-4 mr-2" />
            Airbnb Properties
          </TabsTrigger>
          <TabsTrigger value={LocationType.EVENT_VENUE}>
            <Building className="h-4 w-4 mr-2" />
            Event Venues
          </TabsTrigger>
          <TabsTrigger value={LocationType.OFFICE}>
            <Building2 className="h-4 w-4 mr-2" />
            Offices
          </TabsTrigger>
          <TabsTrigger value={LocationType.OTHER}>
            <MapPin className="h-4 w-4 mr-2" />
            Other Locations
          </TabsTrigger>
        </TabsList>

        {/* Location Form */}
        {isFormOpen && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingLocationId ? 'Edit Location' : 'Add New Location'}</CardTitle>
              <CardDescription>
                {editingLocationId 
                  ? 'Update the details of this location' 
                  : 'Enter the details of the new location'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      placeholder="Location name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select 
                      name="type" 
                      value={formData.type} 
                      onValueChange={(value) => handleSelectChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LocationType.AIRBNB}>Airbnb Property</SelectItem>
                        <SelectItem value={LocationType.EVENT_VENUE}>Event Venue</SelectItem>
                        <SelectItem value={LocationType.OFFICE}>Office</SelectItem>
                        <SelectItem value={LocationType.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    placeholder="Full address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    placeholder="Description or notes about this location"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Information</label>
                  <Input 
                    name="contactInfo" 
                    value={formData.contactInfo} 
                    onChange={handleInputChange} 
                    placeholder="Phone numbers, email addresses, etc."
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary">
                    <Save className="h-4 w-4 mr-2" />
                    {editingLocationId ? 'Update' : 'Save'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Location Lists */}
        {Object.values(LocationType).map((type) => (
          <TabsContent key={type} value={type} className="mt-0">
            {isLoading ? (
              <div className="text-center py-8">Loading locations...</div>
            ) : filteredLocations.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-gray-50">
                <p className="text-gray-500">No {type} locations found. Add your first one!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocations.map((location: Location) => (
                  <Card key={location.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="bg-primary/10 p-2 rounded-full mr-3">
                            {getLocationIcon(location.type)}
                          </div>
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(location)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this location? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteLocationMutation.mutate(location.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-gray-500 text-sm mb-2">{location.address}</p>
                      {location.description && (
                        <p className="text-sm mb-2">{location.description}</p>
                      )}
                      {location.contactInfo && (
                        <>
                          <Separator className="my-2" />
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Contact:</span> {location.contactInfo}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default LocationsPage;