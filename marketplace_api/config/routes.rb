Rails.application.routes.draw do

  namespace :api, defaults: { format: :json } do
    namespace :v1, defaults: { format: :json } do

    devise_for :users,
      path: 'auth',
      defaults: { format: :json },
      path_names: {
        sign_in: 'login',
        sign_out: 'logout',
        registration: 'register'
    },
      controllers: {
        registrations: 'api/v1/registrations'
    }

      # Public Endpoints
      resources :categories, only: [:index]
      resources :products, only: [:index, :show] do
        resources :reviews, only: [:index, :create]
      end

      # Seller Management Endpoints
      namespace :seller do
        resources :products
        resources :orders, only: [:index, :show] do
          patch :update_status, on: :member
        end
      end

      # Admin Endpoints
      namespace :admin do
        resources :sellers, only: [:index] do
          member do
            patch :approve
            patch :reject
            patch :suspend
            patch :reactivate
          end
        end
        resources :categories
        resources :products, only: [:index, :create, :update, :destroy]
        resources :orders, only: [:index, :update]
        resources :reviews, only: [:index, :destroy]
        get 'dashboard', to: 'dashboards#index'
      end

      resources :sellers, only: [:create] do
        collection do
          get :stats
          patch :request_reactivation
          get :billing
          put :update_bank_details
        end
      end

      resource :cart, only: [:show] do
        post :add_item
        patch :update_item, path: 'update_item/:id'
        delete :remove_item, path: 'remove_item/:id'
      end

      resources :orders, only: [:index, :show] do
        collection do
          post :checkout
          post :create_razorpay_order
          post :verify_razorpay_payment
        end
      end
      resources :addresses, only: [:index, :create, :update, :destroy]
      post 'webhooks/razorpay', to: 'webhooks#razorpay'
    end
  end

end