module Paginatable
  extend ActiveSupport::Concern

  def paginate(scope, per_page: 5)
    page = params[:page].to_i > 0 ? params[:page].to_i : 1
    per_page = per_page.to_i

    offset = (page - 1) * per_page

    paginated_data = scope.limit(per_page).offset(offset)

    total_count = scope.count
    total_pages = (total_count.to_f / per_page).ceil

    {
      data: paginated_data,
      meta: {
        current_page: page,
        per_page: per_page,
        total_pages: total_pages,
        total_count: total_count
      } 
    }
  end
end
